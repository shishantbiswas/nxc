import { nanoid } from "nanoid";
import { toast } from "react-hot-toast";
import { proxy } from "valtio";
import type { Nodes } from "../../bknd-types";
import { IMAGE_PREVIEW_SIZE } from "../constants";
import { api } from "../lib/bknd";
import { fileExistsByName } from "../utils/file";
import { getImageThumbnail } from "../utils/get-image-thumbnail";
import { captureFrameFromTimestamp } from "../utils/get-video-frame";
import { getImageDimensions, getVideoDimensions } from "../utils/metadata";
import { getMimeTypeByExtension } from "../utils/mime";
import { uploadFileToBkndWithProgress } from "../utils/upload-with-progress";

export type FileWithId = {
  id: string;
  fileData: File;
};

type Progress = {
  percentage: number;
  totalBytes: number;
  totalTransfered: number;
};

export interface FileTask {
  id: string;
  name: string;
  type: "URL" | "FILE" | "CONVERT";
  path: string;
  size: number;
  progress: Progress;
  status: "pending" | "uploading" | "completed" | "error" | "converting";
  error?: string;
}

export const uploadStore = proxy<{
  tasks: Record<string, FileTask>;

  queueUrl: (otp: {
    url: string;
    folderId?: string | null;
    onSucess?: (data: {
      url: string;
      id: string;
      name: string;
      folderId: string | null | undefined;
    }) => void;
    onFinish?: (info: {
      errorCount: number;
      hasError: boolean;
      sucessCount: number;
      completedSuccessfully: boolean;
    }) => void;
    onError?: (msg: string) => void;
  }) => void;

  startUpload: (opt: {
    files: FileWithId[];
    folderId?: string | null;
    onSucess?: (node: Omit<Nodes, "id"> & { id: string }) => void;
    onFinish?: (info: {
      errorCount: number;
      hasError: boolean;
      sucessCount: number;
      completedSuccessfully: boolean;
    }) => void;
    onError?: (msg: string) => void;
  }) => Promise<void>;

  beginVideoConvert: (opt: {
    name: string;
    id: string;
    resolution: string;
  }) => Promise<void>;
  cancelTask: (id: string) => void;

  clearCompleted: () => void;
}>({
  tasks: {},

  beginVideoConvert: async ({ id, resolution, name }) => {
    const newTasks: FileTask = {
      id,
      name,
      type: "CONVERT",
      path: name,
      progress: { percentage: 0, totalBytes: 0, totalTransfered: 0 },
      size: 0,
      status: "converting",
    };
    Object.assign(uploadStore.tasks, { [id]: newTasks });
    const taskUpload = uploadStore.tasks[id];
    const res = await fetch("/api/convert", {
      method: "POST",
      body: JSON.stringify({
        id,
        resolution,
      }),
    });

    const data = await res.json();
    if (data.sucess) {
      taskUpload.status = "completed";
      taskUpload.progress.percentage = 100;
      taskUpload.progress.totalBytes = 0;
      taskUpload.progress.totalTransfered = 0;
    } else {
      taskUpload.status = "error";
    }
  },

  async startUpload({ files, folderId, onSucess, onError, onFinish }) {
    const newTasks: Record<string, FileTask> = {};
    const taskIds: string[] = [];

    await api.verifyAuth();
    const user = api.getUser();

    if (!user) {
      toast.error("Unauthorized");
      return;
    }

    files.forEach((data) => {
      const file = data.fileData;
      const id = data.id;

      taskIds.push(id);
      newTasks[id] = {
        id,
        name: file.name,
        path: file.webkitRelativePath || file.name,
        size: file.size,
        type: "FILE",
        progress: { percentage: 0, totalBytes: file.size, totalTransfered: 0 },
        status: "pending",
      };
    });

    Object.assign(uploadStore.tasks, newTasks);

    for (let i = 0; i < files.length; i++) {
      const id = taskIds[i];
      const file = files[i].fileData;
      const fileExists = await fileExistsByName(file.name, folderId);
      if(fileExists){
          uploadStore.tasks[id].status = "error";
          uploadStore.tasks[id].error = "File already exists in that folder";
        return
      }
      const ext =
        file.name.lastIndexOf(".") !== -1
          ? file.name.slice(file.name.lastIndexOf("."))
          : "";

      const filename = ext ? id + ext : id;

      if (!uploadStore.tasks[id]) continue; // Skip if canceled

      uploadStore.tasks[id].status = "uploading";
      const metaUrl = URL.createObjectURL(file);

      try {
        const { data } = await uploadFileToBkndWithProgress({
          file,
          options: {
            filename,
            onProgress: ({ percentage }) => {
              uploadStore.tasks[id].progress.percentage = percentage;
            },
          },
        });
        if (uploadStore.tasks[id]) {
          uploadStore.tasks[id].status = "completed";
        }
        const mime = getMimeTypeByExtension(file.name);
        const meta: any = {};

        if (mime?.startsWith("video/")) {
          meta.fileType = "video";
          const video = await getVideoDimensions(metaUrl);
          meta.width = video.width;
          meta.height = video.height;
          meta.duration = video.duration;
          if (user.preferences?.generateVideoPreviews) {
            const thumbnail = await captureFrameFromTimestamp(
              metaUrl,
              file.name,
              20,
            ).catch(() => undefined);
            if (thumbnail) {
              const filename = `preview_${nanoid()}${ext}`;
              await api.media.upload(thumbnail, {
                filename,
              });
              meta.preview = filename;
            }
          }
        }

        if (mime?.startsWith("image/")) {
          meta.fileType = "image";
          const image = await getImageDimensions(metaUrl);
          meta.width = image.width;
          meta.height = image.height;
          if (
            user.preferences?.generateImagePreviews &&
            file.size > IMAGE_PREVIEW_SIZE
          ) {
            const thumbnail = await getImageThumbnail(metaUrl, file.name).catch(
              () => undefined,
            );
            if (thumbnail) {
              const filename = `preview_${nanoid()}${ext}`;
              await api.media.upload(thumbnail, {
                filename,
              });
              meta.preview = filename;
            }
          }
        }

        const newNode = await api.data.createOne("nodes", {
          name: file.name,
          type: "FILE",
          users_id: user.id as string,
          media_id: data.id as string,
          parent_id: folderId ?? undefined,
          mime_type: mime || "application/octet-stream",
          metadata: {
            size: file.size,
            ...(meta.fileType ? meta : undefined),
          },
        });
        onSucess?.(newNode.data);
      } catch (error) {
        console.log({ error });
        const errMsg =
          error instanceof Error
            ? error.message
            : `Error Uploading ${file.name}`;
        if (uploadStore.tasks[id]) {
          uploadStore.tasks[id].status = "error";
          uploadStore.tasks[id].error = errMsg;
        }
        onError?.(errMsg);
      } finally {
        URL.revokeObjectURL(metaUrl);
      }
    }
    const tasks = Object.values(uploadStore.tasks);
    const completed = tasks.filter((t) => t.status === "completed").length;
    const error = tasks.filter((t) => t.status === "error").length;
    onFinish?.({
      errorCount: error,
      hasError: error > 0,
      sucessCount: completed,
      completedSuccessfully: completed === tasks.length,
    });
  },

  async queueUrl({ url, folderId, onSucess, onError, onFinish }) {
    await api.verifyAuth();
    const user = api.getUser();

    if (!user) {
      toast.error("Unauthorized");
      return;
    }

    const _url = new URL(url);
    const lastPath = _url.pathname.lastIndexOf("/");
    const name = _url.pathname.slice(lastPath === -1 ? 0 : lastPath + 1);
    const id = nanoid();

    const newTasks: FileTask = {
      id,
      type: "URL",
      name: name,
      path: _url.pathname,
      progress: { percentage: 0, totalBytes: 0, totalTransfered: 0 },
      size: 0,
      status: "pending",
    };
    Object.assign(uploadStore.tasks, { [id]: newTasks });
    const taskUpload = uploadStore.tasks[id];

    try {
      const progressResponse = await fetch("/api/media/upload-by-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ url, id, name, folderId }),
      });

      if (!progressResponse.body) return;

      const reader = progressResponse.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readingDone } = await reader.read();
        done = readingDone;
        if (done) {
          taskUpload.status = "completed";
        }

        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataContent = JSON.parse(line.replace("data: ", "").trim());
              taskUpload.progress.percentage = dataContent.percentage ?? 0;
              taskUpload.progress.totalBytes = dataContent.totalBytes ?? 0;
              taskUpload.size = dataContent.totalBytes ?? 0;
              taskUpload.progress.totalTransfered =
                dataContent.receivedBytes ?? 0;
            }
          }
        }
      }
      onSucess?.({ url, id, name, folderId });
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : `Error Uploading ${name}`;
      taskUpload.status = "error";
      taskUpload.error = errMsg;
      onError?.(errMsg);
    } finally {
      const tasks = Object.values(uploadStore.tasks);
      const completed = tasks.filter((t) => t.status === "completed").length;
      const error = tasks.filter((t) => t.status === "error").length;
      onFinish?.({
        errorCount: error,
        hasError: error > 0,
        sucessCount: completed,
        completedSuccessfully: completed === tasks.length,
      });
    }
  },

  cancelTask(id: string) {
    delete uploadStore.tasks[id];
  },

  clearCompleted() {
    Object.keys(uploadStore.tasks).forEach((id) => {
      if (uploadStore.tasks[id].status === "completed") {
        delete uploadStore.tasks[id];
      }
    });
  },
});
