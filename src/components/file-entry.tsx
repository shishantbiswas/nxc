import { Link, useRouteContext } from "@tanstack/react-router";
import { useLocalStorage } from "@uidotdev/usehooks";
import type { Nodes } from "../../bknd-types";
import { getFileIconByMimeType } from "../lib/get-file-icon-by-mime-type";
import { getFilePreviewByMimeType } from "../lib/get-file-preview-by-mime-type";
import { cn } from "../utils/cn";
import { NodeDropdown } from "./node-dropdown";

const NON_LANDSCAPE = ["portrait", "text bottom", "text top"];
export function FileTile({
  file,
}: {
  file: Omit<Nodes, "id"> & { id: string };
}) {
  const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", file.id);
  };
  const [tileStyle] = useLocalStorage<
    "portrait" | "landscape" | "text bottom" | "text top"
  >("tile-style", "portrait");

  const { user } = useRouteContext({ strict: false });
  const FilePreview = getFilePreviewByMimeType({
    user,
    node: file,
    previewClassName: NON_LANDSCAPE.includes(tileStyle)
      ? "size-none h-32! w-full object-cover rounded"
      : "",
    iconClassName: NON_LANDSCAPE.includes(tileStyle) ? "h-32!" : "",
  });

  const FileIcon = getFileIconByMimeType(file.mime_type);

  if (tileStyle !== "landscape") {
    return (
      <div
        className={cn(
          "flex w-full p-2 bg-neutral/10 hover:bg-neutral/20 rounded-lg group",
          tileStyle === "text bottom" ? "flex-col" : "flex-col-reverse",
        )}
      >
        <Link
          to="."
          draggable="true"
          onDragStart={handleDragStart}
          search={(pre) => ({ ...pre, fileId: file.media_id })}
          className="flex items-center justify-center w-full"
        >
          {FilePreview}
        </Link>
        <div
          className={cn(
            "flex p-1 h-10 gap-2 items-center",
            tileStyle === "text bottom" ? "mt-2" : "mb-2",
          )}
        >
          <FileIcon className="size-4" />
          <p className="truncate min-w-0 flex-1 pr-8 opacity-70 group-hover:opacity-100 ">
            {file.name}
          </p>
          <NodeDropdown node={file} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-start hover:bg-neutral/20 rounded-lg w-full group">
      <Link
        to="."
        draggable="true"
        onDragStart={handleDragStart}
        search={(pre) => ({ ...pre, fileId: file.media_id })}
        className="flex items-center gap-4 justify-center w-[calc(100%-2.5rem)] px-3 py-2 "
      >
        {FilePreview}
        <p className="truncate min-w-0 flex-1">{file.name}</p>
      </Link>
      <NodeDropdown node={file} />
    </div>
  );
}
