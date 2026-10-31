import { exec, spawn } from "node:child_process";
import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { AppPlugin, DB } from "bknd";
import { streamSSE } from "hono/streaming";
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

      const resolutionWithoutP = body.resolution.endsWith("p")
        ? body.resolution.slice(0, body.resolution.length - 1)
        : body.resolution;

      const { data: node } = await api.data.readOne("nodes", body.id!, {
        with: ["media"],
      });
      if (!node) return c.json({ error: true, message: "file not found" }, 404);
      if (
        node.type !== "FILE" ||
        !node.media_id ||
        node.metadata?.fileType !== "video"
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

      const tempFilePath = path.join(tmpdir(), `${nanoid()}${ext}`);
      const tempFileOutputPath = path.join(
        tmpdir(),
        `${body.resolution}_${nanoid()}${ext}`,
      );
      return streamSSE(c as any, async (stream) => {
        try {
          const file = await api.media.download(node.media!.path);
          const buffer = await file.arrayBuffer();

          await writeFile(tempFilePath, Buffer.from(buffer));
          await convertVideo(
            tempFilePath,
            tempFileOutputPath,
            resolutionWithoutP,
            async (progress) => {
              await stream.writeSSE({
                data: JSON.stringify({
                  percentage: progress.percentage,
                  totalBytes: progress.total_size,
                }),
                event: "convert-update",
              });
            },
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
          const video =
            await getVideoDimensionsFromLocalFile(tempFileOutputPath);
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
          // return c.json({
          //   error: true,
          //   message:
          //     error instanceof Error
          //       ? error.message
          //       : "video convertion failed",
          // });
        } finally {
          await unlink(tempFilePath);
          await unlink(tempFileOutputPath);
        }
      });
    });
  },
});

const execAsync = promisify(exec);

async function getVideoDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
  );
  return parseFloat(stdout.trim());
}

export interface FFmpegProgressStats {
  frame: number;
  fps: number;
  stream_index: number;
  bitrate: string;
  total_size: number;
  out_time_ms: number;
  out_time_us: number;
  out_time: string;
  dup_frames: number;
  drop_frames: number;
  speed: string;
  progress: string;
  percentage: number;
}

async function convertVideo(
  inputPath: string,
  outputPath: string,
  resolution: string,
  onProgressUpdate?: (stats: FFmpegProgressStats) => Promise<void>,
): Promise<void> {
  const duration = await getVideoDuration(inputPath);
  const durationMs = duration * 1000000; // FFmpeg outputs time in microseconds

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
      "-progress",
      "pipe:2", // Emits structured key=value format to stderr
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", args);
    ffmpeg.stdin.end();

    const currentStats: Partial<FFmpegProgressStats> = {};

    ffmpeg.stderr.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");

      for (const line of lines) {
        const [key, value] = line.trim().split("=");
        if (!key || !value) continue;

        if (
          [
            "frame",
            "stream_index",
            "total_size",
            "out_time_ms",
            "out_time_us",
            "dup_frames",
            "drop_frames",
          ].includes(key)
        ) {
          currentStats[
            key as
              | "frame"
              | "stream_index"
              | "total_size"
              | "out_time_ms"
              | "out_time_us"
              | "dup_frames"
              | "drop_frames"
          ] = parseInt(value, 10);
        } else if (key === "fps") {
          currentStats.fps = parseFloat(value);
        } else if (
          key === "bitrate" ||
          key === "out_time" ||
          key === "speed" ||
          key === "progress"
        ) {
          currentStats[key] = value;
        }

        // When the "progress" key appears, it marks the end of a complete metrics block
        if (key === "progress") {
          let percentage = 0;
          if (currentStats.out_time_us && durationMs > 0) {
            percentage = Math.min(
              Math.max((currentStats.out_time_us / durationMs) * 100, 0),
              100,
            );
          }

          const fullStats: FFmpegProgressStats = {
            frame: currentStats.frame || 0,
            fps: currentStats.fps || 0,
            stream_index: currentStats.stream_index || 0,
            bitrate: currentStats.bitrate || "0kbits/s",
            total_size: currentStats.total_size || 0,
            out_time_ms: currentStats.out_time_ms || 0,
            out_time_us: currentStats.out_time_us || 0,
            out_time: currentStats.out_time || "00:00:00.000000",
            dup_frames: currentStats.dup_frames || 0,
            drop_frames: currentStats.drop_frames || 0,
            speed: currentStats.speed || "0x",
            progress: currentStats.progress || "continue",
            percentage: Math.round(percentage * 100) / 100,
          };

          if (onProgressUpdate) {
            onProgressUpdate(fullStats).then(null);
          }
        }
      }
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
