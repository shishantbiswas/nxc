import type { DB } from "bknd";
import { api } from "../lib/bknd";

export const uploadFileToBkndWithProgress = async <T = DB["media"]>({
  file,
  options = {},
}: {
  file: File;
  options: {
    filename?: string;
    onProgress?: ({
      totalTransfered,
      percentage,
      totalBytes,
    }: {
      percentage: number;
      totalTransfered: number;
      totalBytes: number;
    }) => void;
  };
}) => {
  const filename = options.filename || file.name;

  // 1. Get bknd's generated upload URL
  const url = api.media.getFileUploadUrl({ path: filename });

  // 2. Extract bknd auth headers
  const headers = api.media.getUploadHeaders();
  headers.set("Content-Type", file.type || "application/octet-stream");

  // 3. Execute request via XHR for progress tracking
  return new Promise<{data: T}>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        if (options.onProgress) {
          options.onProgress({
            percentage,
            totalTransfered: event.loaded,
            totalBytes: event.total,
          });
        } else {
          console.log(
            `Progress: ${event.loaded} / ${event.total} bytes (${percentage}%)`,
          );
        }
      }
    };

    headers.forEach((value, key) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as { data: T };
          resolve(response);
        } catch {
          resolve(xhr.responseText as any);
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.send(file);
  });
};
