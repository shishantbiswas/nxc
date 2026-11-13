import { createWriteStream } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AppPlugin, DB } from "bknd";
import { streamSSE } from "hono/streaming";
import { nanoid } from "nanoid";
import { getMimeTypeByExtension } from "../../utils/mime";
import { getImageThumbnail } from "../../utils/server/get-image-thumbnail";
import { captureFrameFromTimestampFromLocalFile } from "../../utils/server/get-video-frame";
import {
  getImageDimensions,
  getVideoDimensionsFromLocalFile,
} from "../../utils/server/metadata";

export const uploadViaUrlPlugin: AppPlugin = (app) => ({
  name: "uploadViaUrlPlugin",
  onBuilt: async () => {
    app.server.post("/api/media/upload-by-url", async (c) => {
      const reqHeaders = c.req.raw.headers;
      const body = await c.req.json<{
        id?: string;
        url?: string;
        name?: string;
        folderId?: string;
      }>();
      if (!body?.url || !body?.name || !body?.id) {
        return c.json(
          { error: true, message: "('url'|'id'|'name') is not provided" },
          400, // BAD_REQUEST,
        );
      }

      const api = app.getApi({ headers: reqHeaders });
      await api.verifyAuth();
      const { user } = await api.auth.me();

      const verifiedUser = api.isAuthVerified() && api.isAuthenticated();

      if (!verifiedUser || !user) {
        return c.json(
          { error: true, message: "unauthorized access" },
          401, // UNAUTHORIZED,
        );
      }

      const response = await fetch(body.url, {
        redirect: "follow",
        headers: {
          "Accept-Encoding": "identity",
        },
      });
      if (!response.body) {
        return c.json({ error: true, message: "body is empty" });
      }
      const contentLength = response.headers.get("content-length");
      const contentDisposition = response.headers.get("content-disposition");
      const contentType =
        response.headers.get("content-type") ?? "application/octet-stream";

      const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
      const name =
        getFilenameFromContentDisposition(contentDisposition) ?? body.name;

      const tempFilePath = path.join(tmpdir(), `${nanoid()}_${body.name}`);
      const fileWriteStream = createWriteStream(tempFilePath);

      return streamSSE(c as any, async (stream) => {
        let receivedBytes = 0;
        try {
          const reader = response.body!.getReader();

          const writePromise = (async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                fileWriteStream.end();
                break;
              }

              fileWriteStream.write(value);
              receivedBytes += value.length;

              const percentage = totalBytes
                ? Math.round((receivedBytes / totalBytes) * 100)
                : null;

              await stream.writeSSE({
                data: JSON.stringify({ percentage, receivedBytes, totalBytes }),
                event: "upload-update",
              });
            }
          })();

          await writePromise;

          const fileBuffer = await readFile(tempFilePath);

          const file = new File([fileBuffer], body.name as string, {
            type: contentType,
          });
          const size = Number(contentLength ?? file.size);

          const ext =
            name.lastIndexOf(".") !== -1
              ? name.slice(name.lastIndexOf("."))
              : "";

          const { data } = await api.media.upload(file, {
            filename: body.id + ext,
          }); // create media

          const mime = getMimeTypeByExtension(name) ?? contentType;
          const meta: any = {};
          if (mime?.startsWith("video/")) {
            meta.fileType = "video";
            const video = await getVideoDimensionsFromLocalFile(tempFilePath);
            meta.width = video.width;
            meta.height = video.height;
            meta.duration = video.duration;
            if (user.preferences?.generateVideoPreviews) {
              const thumbnail = await captureFrameFromTimestampFromLocalFile(
                tempFilePath,
                name,
                20,
              ).catch(console.error); // ignore error for thumbnail
              if (thumbnail) {
                const filename = `preview_${nanoid()}.jpg`;
                await api.media
                  .upload(thumbnail, {
                    filename,
                  })
                  .catch(console.error); // ignore error for thumbnail
                meta.preview = filename;
              }
            }
          }

          if (mime?.startsWith("image/")) {
            meta.fileType = "image";
            const image = await getImageDimensions(file);
            meta.width = image.width;
            meta.height = image.height;
            if (
              user.preferences?.generateImagePreviews &&
              (Number(contentLength) || size) > 1024 * 1024 * 5
            ) {
              const thumbnail = await getImageThumbnail(file, name).catch(
                console.error,
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

          await api.data.createOne("nodes", {
            name: decodeURIComponent(name),
            type: "FILE",
            users_id: user.id as string,
            media_id: (data as unknown as DB["media"]).id as string,
            parent_id: body.folderId ?? undefined,
            mime_type: mime || "application/octet-stream",
            metadata: {
              size,
              ...(meta.fileType ? meta : undefined),
            },
          });
        } catch (error) {
          console.error("Error processing file stream:", error);
        } finally {
          // Clean up temp file from filesystem
          await unlink(tempFilePath).catch(() => {});
        }
      });
    });
  },
});

function getFilenameFromContentDisposition(content?: string | null) {
  if (!content) return null;

  const utf8FilenameRegex = /filename\*=UTF-8''([\w%\-.]+)(?:; ?|$)/i;
  const asciiFilenameRegex = /^filename=(["']?)(.*?[^\\])\1(?:; ?|$)/i;

  // 1. Try to extract UTF-8 encoded filename
  if (utf8FilenameRegex.test(content)) {
    return decodeURIComponent(utf8FilenameRegex.exec(content)![1]);
  }

  // 2. Fallback to standard ASCII filename
  const filenameStart = content.toLowerCase().indexOf("filename=");
  if (filenameStart >= 0) {
    const partialDisposition = content.slice(filenameStart);
    const matches = asciiFilenameRegex.exec(partialDisposition);
    if (matches?.[2]) {
      return matches[2];
    }
  }

  return null;
}
