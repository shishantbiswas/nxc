import { spawn } from "node:child_process";
import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AppPlugin, DB } from "bknd";
import { nanoid } from "nanoid";
import { captureFrameFromTimestampFromLocalFile } from "../../utils/server/get-video-frame";
import { getVideoDimensionsFromLocalFile } from "../../utils/server/metadata";

export const convertVideoPlugin: AppPlugin = (app) => ({
  name: "convertVideo",
  onBuilt: async () => {
    app.server.post("/api/convert", async (c) => {
      const headers = c.req.raw.headers;

      const api = app.getApi({ headers });
      await api.verifyAuth();
      const { user } = await api.auth.me();

      const verifiedUser = api.isAuthVerified() && api.isAuthenticated();

      if (!verifiedUser || !user) {
        return c.json(
          { error: true, message: "unauthorized access" },
          401, // UNAUTHORIZED,
        );
      }
      const body = await c.req.json<{
        id?: string;
        resolution?: string;
      }>();

      if (!body.id || !body.resolution) {
        return c.json({
          error: true,
          message: "('id'|'resolution') is required",
        });
      }

      const { data: node } = await api.data.readOne("nodes", body.id, {
        with: ["media"],
      });
      if (!node) return c.json({ error: true, message: "file not found" }, 404);

      if (
        node.type !== "FILE" ||
        !node.media_id ||
        node.metadata.fileType !== "video"
      ) {
        console.log({ node, id: body.id });
        return c.json(
          { error: true, message: "only video files are convertible" },
          422, // Unprocessable Entity,
        );
      }
      const ext =
        node.name.lastIndexOf(".") !== -1
          ? node.name.slice(node.name.lastIndexOf("."))
          : "";
      const resolutionWithoutP = body.resolution.endsWith("p")
        ? body.resolution.slice(0, body.resolution.length - 1)
        : body.resolution;

      const tempFilePath = path.join(tmpdir(), `${nanoid()}${ext}`);
      const tempFileOutputPath = path.join(
        tmpdir(),
        `${body.resolution}_${nanoid()}${ext}`,
      );

      try {
        const file = await api.media.download(node.media!.path);
        const buffer = await file.arrayBuffer();

        await writeFile(tempFilePath, Buffer.from(buffer));
        await convertVideo(
          tempFilePath,
          tempFileOutputPath,
          resolutionWithoutP,
        );

        const convertedBuffer = await readFile(tempFileOutputPath);

        const convertedFile = new File([convertedBuffer], body.id + ext, {
          type: node.mime_type,
        });

        const { data } = await api.media.upload(convertedFile, {
          filename: `${nanoid()}${ext}`,
        });
        const stats = await stat(tempFileOutputPath);

        const meta: any = {};
        meta.fileType = "video";
        const video = await getVideoDimensionsFromLocalFile(tempFileOutputPath);
        meta.width = video.width;
        meta.height = video.height;
        meta.duration = video.duration;
        if (user.preferences?.generateVideoPreviews) {
          const thumbnail = await captureFrameFromTimestampFromLocalFile(
            tempFileOutputPath,
            node.name,
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

        await api.data.createOne("nodes", {
          name: `${body.resolution}_${node.name}`,
          type: "FILE",
          users_id: user.id as string,
          media_id: (data as unknown as DB["media"]).id as string,
          parent_id: node.parent_id ?? undefined,
          mime_type: node.mime_type,
          metadata: {
            size: stats.size,
            ...(meta.fileType ? meta : undefined),
          },
        });
      } catch (error) {
        console.error(error);
        return c.json({
          error: true,
          message:
            error instanceof Error ? error.message : "video convertion failed",
        });
      } finally {
        await unlink(tempFilePath);
        await unlink(tempFileOutputPath);
      }

      return c.json({
        sucess: true,
        message: "video converted",
      });
    });
  },
});

async function convertVideo(
  inputPath: string,
  outputPath: string,
  resolution: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args: string[] = [
      "-i",
      inputPath,
      "-vf",
      `scale=-2:${resolution}`,
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stdin.end();

    ffmpeg.stdout.on("data", (data: Buffer) => {
      console.log(`stdout: ${data}`);
    });

    ffmpeg.stderr.on("data", (data: Buffer) => {
      console.error(`stderr: ${data}`);
    });

    ffmpeg.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    ffmpeg.on("error", (err: Error) => {
      reject(err);
    });
  });
}
