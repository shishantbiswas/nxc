export function getVideoDimensions(url: string): Promise<{
  height: number;
  width: number;
  duration: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");

    video.addEventListener(
      "loadedmetadata",
      function () {
        resolve({
          width: this.videoWidth,
          height: this.videoHeight,
          duration: this.duration,
        });
      },
      false,
    );

    video.addEventListener("error", (err) => {
      reject(new Error("Failed to load image. Make sure the URL is valid."));
    });

    video.src = url;
  });
}

export function getImageDimensions(url: string): Promise<{
  height: number;
  width: number;
}> {
  return new Promise((resolve, reject) => {
    const image = new Image(); // Equivalent to document.createElement("img")

    // Use 'load' instead of 'loadedmetadata' for HTML Image elements
    image.addEventListener("load", function () {
      resolve({
        // naturalWidth/Height returns the real dimensions of the source image file
        width: this.naturalWidth,
        height: this.naturalHeight,
      });
    });

    // Handle broken links or invalid files to prevent the Promise from hanging
    image.addEventListener("error", (err) => {
      reject(new Error("Failed to load image. Make sure the URL is valid."));
    });

    image.src = url;
  });
}
