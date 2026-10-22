import { FileArchive, FileAudio, FileChartColumn, FileCode, FileIcon, FileImage, FileText, FileVideo, type LucideIcon } from "lucide-react";

export function getFileIconByMimeType(mime_type?: string): LucideIcon {
  switch (mime_type) {
    case "image/png":
    case "image/jpg":
    case "image/jpeg":
    case "image/webp":
    case "image/avif":
    case "image/gif":
      return FileImage;
    case "image/svg+xml":
    case "application/xml":
    case "text/css":
    case "text/html":
    case "application/json":
      return FileCode;
    case "application/zip":
      return FileArchive;
    case "video/mp4":
    case "video/webm":
    case "video/quicktime":
      return FileVideo;
    case "audio/mpeg":
    case "audio/mp4":
    case "audio/aac":
      return FileAudio;
    case "application/pdf":
      return FileChartColumn;
    case "plain/txt":
    case "text/markdown":
      return FileText;
    default:
      return FileIcon;
  }
}
