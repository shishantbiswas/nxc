import type { SafeUser } from "bknd";
import type React from "react";
import type { Nodes } from "../../bknd-types";
import { IMAGE_PREVIEW_SIZE } from "../constants";
import { cn } from "../utils/cn";
import { getFileIconByMimeType } from "./get-file-icon-by-mime-type";

export function getFilePreviewByMimeType({
  node,
  className,
  iconClassName,
  previewClassName,
  user,
}: {
  node: Omit<Nodes, "id"> & { id: string };
  className?: string;
  user: SafeUser | undefined;
  iconClassName?: string;
  previewClassName?: string;
}): React.ReactNode {
  const FileIcon = getFileIconByMimeType(node.mime_type);

  switch (node.mime_type) {
    case "image/png":
    case "image/jpg":
    case "image/jpeg":
    case "image/webp":
    case "image/avif":
    case "image/svg+xml":
    case "image/gif": {
      if (node.metadata.size <= IMAGE_PREVIEW_SIZE) {
        return (
          <img
            src={`/api/media/file/${node.media?.path}`}
            className={cn(
              "shrink-0 size-10 object-contain",
              className,
              previewClassName,
            )}
            alt="Preview"
          />
        );
      } else {
        if (
          !user?.preferences?.generateImagePreviews ||
          !("preview" in node.metadata)
        ) {
          return <FileIcon className={cn("shrink-0 size-10", iconClassName)} />;
        }

        return (
          <img
            src={`/api/media/file/${node.metadata.preview}`}
            className={cn(
              "shrink-0 size-10 object-contain",
              className,
              previewClassName,
            )}
            alt="Preview"
          />
        );
      }
    }
    case "video/mp4":
    case "video/webm":
    case "video/quicktime": {
      if (
        !user?.preferences?.generateVideoPreviews ||
        !("preview" in node.metadata)
      )
        return (
          <FileIcon
            className={cn("shrink-0 size-10", className, iconClassName)}
          />
        );
      return (
        <img
          src={`/api/media/file/${node.metadata.preview}`}
          className={cn(
            "shrink-0 size-10 object-contain",
            className,
            previewClassName,
          )}
          alt="Preview"
        />
      );
    }
    default: {
      return (
        <FileIcon
          className={cn("shrink-0 size-10", className, iconClassName)}
        />
      );
    }
  }
}
