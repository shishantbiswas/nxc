export async function captureFrameFromTimestamp(
  fileUrl: string,
  baseName: string,
  timestampInSeconds: number,
  { targetHeight = 360, quality = 0.85 } = {},
):Promise<File> {
  const video = document.createElement("video");

  video.muted = true;
  video.playsInline = true;

  video.src = fileUrl;

  return new Promise((resolve, reject) => {
    const cleanUp = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const aspectRatio = video.videoWidth / video.videoHeight;
        const targetWidth = Math.round(targetHeight * aspectRatio);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            cleanUp();

            if (!blob) {
              reject(new Error("Canvas blob generation failed."));
              return;
            }

            const outputFileName = `${baseName}_frame_${timestampInSeconds.toFixed(2)}s.jpg`;

            const frameFile = new File([blob], outputFileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve(frameFile);
          },
          "image/jpeg",
          quality,
        );
      } catch (error) {
        cleanUp();
        reject(error);
      }
    };

    const onError = () => {
      cleanUp();
      reject(new Error("Failed to process or decode the local video file."));
    };

    video.addEventListener("loadedmetadata", () => {
      const safeTime = Math.min(timestampInSeconds, video.duration);
      video.addEventListener("seeked", onSeeked);
      video.currentTime = safeTime;
    });

    video.addEventListener("error", onError);
  });
}
