import { spawn } from "node:child_process";
import { Readable } from "node:stream";

interface CompressVideoOptions {
  targetWidth?: number;
  crf?: number; // Constant Rate Factor: lower means higher quality (Default 23 is optimal for H.264)
}

/**
 * Compresses a video down to a specific width constraint.
 */
export async function compressVideoToWidthFromUrl(
  fileUrl: string,
  baseName: string,
  { targetWidth = 1280, crf = 23 }: CompressVideoOptions = {},
): Promise<File> {
  return new Promise((resolve, reject) => {
    // scale parameter ensures height remains divisible by 2 (requirement for H.264 video codec formats)
    const args = [
      "-i",
      fileUrl,
      "-vf",
      `scale=${targetWidth}:trunc(ow/a/2)*2`,
      "-vcodec",
      "libx264",
      "-crf",
      crf.toString(),
      "-preset",
      "fast",
      "-movflags",
      "frag_keyframe+empty_moov", // Prepares block architecture safely over stdout streaming limits
      "-f",
      "mp4",
      "pipe:1",
    ];

    const child = spawn("ffmpeg", args);
    const chunks: Buffer[] = [];
    let stderrData = "";

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (data) => (stderrData += data));

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(
            `ffmpeg compression pipeline failed with code ${code}. Error: ${stderrData}`,
          ),
        );
      }

      const finalBuffer = Buffer.concat(chunks);
      resolve(
        new File([finalBuffer], `${baseName}.mp4`, { type: "video/mp4" }),
      );
    });
  });
}

interface CompressVideoOptions {
  targetWidth?: number;
  crf?: number;
}

/**
 * Compresses a video File object down to a specific width constraint.
 */
export async function compressVideoToWidth(
  sourceFile: File,
  baseName: string,
  { targetWidth = 1280, crf = 23 }: CompressVideoOptions = {},
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Configured to take input from pipe:0 and output fragment-ready container formats to pipe:1
    const args = [
      "-i",
      "pipe:0",
      "-vf",
      `scale=${targetWidth}:trunc(ow/a/2)*2`,
      "-vcodec",
      "libx264",
      "-crf",
      crf.toString(),
      "-preset",
      "fast",
      "-movflags",
      "frag_keyframe+empty_moov+faststart",
      "-f",
      "mp4",
      "pipe:1",
    ];

    const child = spawn("ffmpeg", args);
    const chunks: Buffer[] = [];
    let stderrData = "";

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (data) => (stderrData += data));

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(
            `ffmpeg compression pipeline failed with code ${code}. Error: ${stderrData}`,
          ),
        );
      }

      const finalBuffer = Buffer.concat(chunks);
      resolve(
        new File([finalBuffer], `${baseName}.mp4`, { type: "video/mp4" }),
      );
    });

    // Pipe the video file binary data directly into ffmpeg stdin
    try {
      sourceFile.arrayBuffer().then((arrayBuffer) => {
        const nodeStream = Readable.from(Buffer.from(arrayBuffer));
        nodeStream.pipe(child.stdin);
      });
    } catch (streamError) {
      reject(
        new Error(
          `Failed streaming source video file to encoder: ${(streamError as Error).message}`,
        ),
      );
    }
  });
}
