export async function getImageThumbnail(
  sourceFile: string,
  name: string,
  { targetHeight = 360, quality = 0.85 } = {},
): Promise<File> {
  const img = new Image();

  img.src = sourceFile;

  return new Promise((resolve, reject) => {
    const cleanUp = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const targetWidth = Math.round(targetHeight * aspectRatio);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            cleanUp();

            if (!blob) {
              reject(new Error("Canvas blob generation failed."));
              return;
            }

            const baseName =
              name.substring(0, name.lastIndexOf(".")) || "image";
            const outputFileName = `${baseName}_compressed_${targetHeight}p.jpg`;

            const compressedFile = new File([blob], outputFileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          "image/jpeg",
          quality,
        );
      } catch (error) {
        cleanUp();
        reject(error);
      }
    };

    img.onerror = () => {
      cleanUp();
      reject(new Error("Failed to load or decode the local image file."));
    };
  });
}
