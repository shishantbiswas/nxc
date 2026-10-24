import { Link, useRouter } from "@tanstack/react-router";
import { useLocalStorage } from "@uidotdev/usehooks";
import { Folder } from "lucide-react";
import { useState } from "react";
import type { Nodes } from "../../bknd-types";
import { api } from "../lib/bknd";
import { cn } from "../utils/cn";
import { NodeDropdown } from "./node-dropdown";

export function FolderTile({
  folder,
}: {
  folder: Omit<Nodes, "id"> & { id: string };
}) {
  const [tileStyle] = useLocalStorage<
    "portrait" | "landscape" | "text bottom" | "text top"
  >("tile-style", "portrait");

  const router = useRouter();
  const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", folder.id);
  };

  const handleOnDrag = async (e: React.DragEvent<HTMLAnchorElement>) => {
    setIsDragOver(false);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) {
      return;
    }
    await api.data.updateOne("nodes", id, {
      parent_id: folder.id,
    });
    router.invalidate();
  };

  const [isDragOver, setIsDragOver] = useState(false);

  if (tileStyle !== "landscape") {
    return (
      <div
        className={cn(
          "flex w-full p-2 bg-neutral/10 hover:bg-neutral/20 rounded-lg group",
          tileStyle === "text bottom" ? "flex-col" : "flex-col-reverse",
          isDragOver ? 'bg-neutral/40' : 'hover:bg-neutral/20'
        )}
      >
        <Link
          to="."
          draggable="true"
          onDrop={handleOnDrag}
          onDragStart={handleDragStart}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          search={(pre) => ({
            ...pre,
            folderId: folder.id,
          })}
          className="flex flex-col h-32! items-center justify-center "
        >
          <Folder className="size-10 shrink-0" />
          <p className="text-sm truncate text-wrap text-center px-4">{folder.name}</p>
        </Link>
        <div
          className={cn(
            "flex p-1 h-10 gap-2 items-center",
            tileStyle === "text bottom" ? "mt-2" : "mb-2",
          )}
        >
          <Folder className="size-4" />
          <p className="truncate min-w-0 flex-1 pr-8 opacity-70 group-hover:opacity-100 ">
            {folder.name}
          </p>
          <NodeDropdown node={folder} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-start hover:bg-neutral/20 rounded-lg w-full group ">
      <Link
        to="."
        search={(pre) => ({
          ...pre,
          folderId: folder.id,
        })}
        draggable="true"
        onDragStart={handleDragStart}
        onDrop={handleOnDrag}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);  
        }}
        onDragLeave={() => setIsDragOver(false)}
        className="flex items-center justify-start gap-4 w-[calc(100%-2.5rem)] px-3 py-2"
      >
        <Folder className="fill-accent stroke-accent size-10" />
        <h2 className="truncate min-w-0 flex-1">{folder.name}</h2>
      </Link>
      <NodeDropdown node={folder} />
    </div>
  );
}
