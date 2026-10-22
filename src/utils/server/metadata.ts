import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

// export async function getAudioDuration(file: File): Promise<number> {
//   return new Promise((resolve, reject) => {
//     const args = [
//       "-v",
//       "error",
//       "-select_streams",
//       "a:0",
//       "-show_entries",
//       "stream=duration",
//       "-of",
//       "json",
//       "pipe:0",
//     ];

//     const child = spawn("ffprobe", args);

//     let stdoutData = "";
//     let stderrData = "";

//     child.stdout.on("data", (data) => {
//       stdoutData += data;
//     });
//     child.stderr.on("data", (data) => {
//       stderrData += data;
//     });

//     child.on("close", (code) => {
//       if (code !== 0) {
//         return reject(
//           new Error(`ffprobe failed with code ${code}. Error: ${stderrData}`),
//         );
//       }

//       try {
//         const metadata = JSON.parse(stdoutData);
//         if (!metadata.streams || metadata.streams.length === 0) {
//           return reject(
//             new Error("No valid audio streams found in File object."),
//           );
//         }

//         const stream = metadata.streams[0];
//         resolve(parseFloat(stream.duration) || 0);
//       } catch (parseError) {
//         reject(
//           new Error(
//             `Failed to parse ffprobe audio output: ${(parseError as Error).message}`,
//           ),
//         );
//       }
//     });

//     try {
//       file.arrayBuffer().then((arrayBuffer) => {
//         const nodeStream = Readable.from(Buffer.from(arrayBuffer));
//         nodeStream.pipe(child.stdin);
//       });
//     } catch (streamError) {
//       reject(
//         new Error(
//           `Failed streaming File data to child process: ${(streamError as Error).message}`,
//         ),
//       );
//     }
//   });
// }

interface VideoMetadata {
  height: number;
  width: number;
  duration: number;
}

/**
 * Extracts width, height, and duration from a File object
 */

export async function getVideoDimensions(file: File): Promise<VideoMetadata> {
  const tempFilePath = join(
    tmpdir(),
    `upload-${Date.now()}-${Math.random().toString(36).substring(2)}.tmp`,
  );

  try {
    // 1. Write the File arrayBuffer to a temporary file
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));

    // 2. Arguments to read from the temporary file path
    const args = [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,duration",
      "-of",
      "json",
      tempFilePath,
    ];

    const child = spawn("ffprobe", args);

    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (data) => {
      stdoutData += data;
    });
    child.stderr.on("data", (data) => {
      stderrData += data;
    });

    return await new Promise((resolve, reject) => {
      child.on("close", async (code) => {
        // Clean up the temp file
        await fs.unlink(tempFilePath).catch(() => {});

        if (code !== 0) {
          return reject(
            new Error(`ffprobe failed with code ${code}. Error: ${stderrData}`),
          );
        }

        try {
          const metadata = JSON.parse(stdoutData);
          if (!metadata.streams || metadata.streams.length === 0) {
            return reject(
              new Error("No valid video streams found in File object."),
            );
          }

          const stream = metadata.streams[0];
          resolve({
            width: parseInt(stream.width, 10),
            height: parseInt(stream.height, 10),
            duration: parseFloat(stream.duration) || 0,
          });
        } catch (parseError) {
          reject(
            new Error(
              `Failed to parse ffprobe video output: ${(parseError as Error).message}`,
            ),
          );
        }
      });

      child.on("error", async (err) => {
        await fs.unlink(tempFilePath).catch(() => {});
        reject(err);
      });
    });
  } catch (error) {
    // Ensure cleanup if setup fails before child process starts
    await fs.unlink(tempFilePath).catch(() => {});
    throw new Error(
      `Failed to process video with temporary file: ${(error as Error).message}`,
    );
  }
}

/**
 * Extracts width, height, and duration from a local fs path
 */

export async function getVideoDimensionsFromLocalFile(
  path: string,
): Promise<VideoMetadata> {
  try {
    const args = [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,duration",
      "-of",
      "json",
      path,
    ];

    const child = spawn("ffprobe", args);

    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (data) => {
      stdoutData += data;
    });
    child.stderr.on("data", (data) => {
      stderrData += data;
    });

    return await new Promise((resolve, reject) => {
      child.on("close", async (code) => {
        if (code !== 0) {
          return reject(
            new Error(`ffprobe failed with code ${code}. Error: ${stderrData}`),
          );
        }

        try {
          const metadata = JSON.parse(stdoutData);
          if (!metadata.streams || metadata.streams.length === 0) {
            return reject(
              new Error("No valid video streams found in File object."),
            );
          }

          const stream = metadata.streams[0];
          resolve({
            width: parseInt(stream.width, 10),
            height: parseInt(stream.height, 10),
            duration: parseFloat(stream.duration) || 0,
          });
        } catch (parseError) {
          reject(
            new Error(
              `Failed to parse ffprobe video output: ${(parseError as Error).message}`,
            ),
          );
        }
      });

      child.on("error", async (err) => {
        reject(err);
      });
    });
  } catch (error) {
    throw new Error(
      `Failed to process video with temporary file: ${(error as Error).message}`,
    );
  }
}

interface ImageMetadata {
  height: number;
  width: number;
}
/**
 * Extracts width and height from an image File object.
 */

export async function getImageDimensions(file: File): Promise<ImageMetadata> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // const dimensions = sizeOf(buffer);
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Could not parse image dimensions from File buffer.");
    }

    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    throw new Error(
      `Failed parsing image File header: ${(error as Error).message}`,
    );
  }
}
