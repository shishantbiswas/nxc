import { spawn } from "node:child_process";
// import { unlink, writeFile } from "node:fs/promises";
// import { tmpdir } from "node:os";
// import path from "node:path";

// export async function captureFrameFromTimestamp(
//   sourceFile: File,
//   baseName: string,
//   timestampInSeconds: number,
//   { targetHeight = 360, quality = 0.85 } = {},
// ): Promise<File> {
//   const tempFilePath = path.join(
//     tmpdir(),
//     `upload-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`,
//   );

//   try {
//     const arrayBuffer = await sourceFile.arrayBuffer();
//     await writeFile(tempFilePath, Buffer.from(arrayBuffer));

//     const args = [
//       "-ss",
//       timestampInSeconds.toString(),
//       "-i",
//       tempFilePath,
//       "-vframes",
//       "1",
//       "-vf",
//       `scale=-1:${targetHeight}`,
//       "-q:v",
//       Math.max(1, Math.min(31, Math.round((1 - quality) * 31))).toString(),
//       "-f",
//       "image2pipe",
//       "-vcodec",
//       "mjpeg",
//       "pipe:1",
//     ];

//     const finalBuffer = await new Promise<Buffer<ArrayBuffer>>((resolve, reject) => {
//       const child = spawn("ffmpeg", args);
//       const chunks: Buffer[] = [];
//       let stderrData = "";

//       child.stdout.on("data", (chunk) => chunks.push(chunk));
//       child.stderr.on("data", (data) => (stderrData += data));

//       child.on("close", (code) => {
//         if (code !== 0) {
//           return reject(
//             new Error(`FFmpeg failed with code ${code}: ${stderrData}`),
//           );
//         }
//         resolve(Buffer.concat(chunks));
//       });
//     });

//     if (finalBuffer.length === 0) {
//       throw new Error("No image buffer captured from video processing.");
//     }

//     return new File([finalBuffer], `${baseName}.jpg`, { type: "image/jpeg" });
//   } finally {
//     // Clean up the temporary file
//     await unlink(tempFilePath).catch(() => {});
//   }
// }

export async function captureFrameFromTimestampFromLocalFile(
  tempFilePath: string,
  baseName: string,
  timestampInSeconds: number,
  { targetHeight = 360, quality = 0.85 } = {},
): Promise<File> {

    const args = [
      "-ss",
      timestampInSeconds.toString(),
      "-i",
      tempFilePath,
      "-vframes",
      "1",
      "-vf",
      `scale=-1:${targetHeight}`,
      "-q:v",
      Math.max(1, Math.min(31, Math.round((1 - quality) * 31))).toString(),
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "pipe:1",
    ];

    const finalBuffer = await new Promise<Buffer<ArrayBuffer>>((resolve, reject) => {
      const child = spawn("ffmpeg", args);
      const chunks: Buffer[] = [];
      let stderrData = "";

      child.stdout.on("data", (chunk) => chunks.push(chunk));
      child.stderr.on("data", (data) => (stderrData += data));

      child.on("close", (code) => {
        if (code !== 0) {
          return reject(
            new Error(`FFmpeg failed with code ${code}: ${stderrData}`),
          );
        }
        resolve(Buffer.concat(chunks));
      });
    });

    if (finalBuffer.length === 0) {
      throw new Error("No image buffer captured from video processing.");
    }

    return new File([finalBuffer], `${baseName}.jpg`, { type: "image/jpeg" });
 
}
