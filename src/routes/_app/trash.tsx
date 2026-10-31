import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  Folder,
  Grid3X3,
  RotateCcwClock,
  TableProperties,
  TrashOff,
} from "lucide-react";
import { TableVirtuoso } from "react-virtuoso";
import { useSnapshot } from "valtio/react";
import type { Nodes } from "../../../bknd-types";
import { Empty } from "../../components/empty";
import { useToast } from "../../components/toast-provider";
import { api } from "../../lib/bknd";
import formatDateOrTime from "../../lib/format-date-time";
import { getFileIconByMimeType } from "../../lib/get-file-icon-by-mime-type";
import { modalStore } from "../../store/modal";
import bytesToSize from "../../utils/format-bytes";
import { truncateText } from "../../utils/truncate-text";

export const Route = createFileRoute("/_app/trash")({
  component: RouteComponent,
  beforeLoad: ({ search }) => search,
  loaderDeps: ({ search }) => search,
  loader: async ({ context }) => {
    const user = context.user;
    const entries = await api.data.readMany("nodes", {
      with: ["media", "users"],
      where: {
        ...(context.folderId ? { parent_id: { $eq: context.folderId } } : {}),
        ...(context.folderId ? {} : { deleted_at: { $isnull: false } }),

        users_id: { $eq: user.id },
      },
      sort: {
        by: "type",
        dir: "desc",
      },
      limit: 4096,
    });

    return {
      entries: entries.data,
      isEmpty: entries.length > 0,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Trash",
      },
    ],
  }),
});

function RouteComponent() {
  const { entries, isEmpty } = Route.useLoaderData();

  if (!Array.isArray(entries) || "error" in entries) {
    throw new Error(
      `Fatal Error Occoured ${entries.error ?? "entries is not a array"}`,
    );
  }
  return (
    <>
      {!isEmpty ? (
        <div className="h-[70vh] flex items-center">
          <Empty
            hideAction
            title="Trash is Empty"
            description="deleted files and folder will appear here"
          />
        </div>
      ) : (
        <NodeTable nodes={entries} />
      )}
    </>
  );
}

function NodeTable({
  nodes,
}: {
  nodes: (Omit<Nodes, "id"> & { id: string })[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { deletedNodes } = useSnapshot(modalStore);
  const [grid, setGrid] = useLocalStorage("layout", true);

  return (
    <>
      <div className="flex items-center justify-between">
        <div></div>
        <div className="flex items-center gap-2">
          {deletedNodes.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn-sm text-sm! btn-info"
                onClick={async () => {
                  await api.data
                    .updateMany(
                      "nodes",
                      {
                        id: { $in: [...deletedNodes] },
                      },
                      // @ts-expect-error
                      { deleted_at: null },
                    )
                    .then(() => {
                      toast(`Restored ${deletedNodes.length} Files/Folder`);
                      modalStore.setDeletedNodes([]);
                      modalStore.setType(null);
                      router.invalidate();
                    })
                    .catch(() => {
                      toast.error(
                        `Error deleting ${deletedNodes.length} Files/Folder`,
                      );
                    });
                }}
              >
                Restore ({deletedNodes.length})
              </button>
              <button
                type="button"
                className="btn btn-sm text-sm! btn-error"
                onClick={() => modalStore.setType("FILE:DELETE")}
              >
                Delete Permanently ({deletedNodes.length})
              </button>
            </>
          )}
          <label
            className="btn btn-square swap swap-rotate tooltip hover:tooltip-open tooltip-left"
            data-tip={`Swap to ${grid ? "Table" : "Grid"} View`}
          >
            <input
              type="checkbox"
              onChange={() => setGrid(!grid)}
              defaultChecked={grid}
            />
            <TableProperties className="swap-on rotate-180" />
            <Grid3X3 className="swap-off" />
          </label>
        </div>
      </div>
      <TableVirtuoso
        className="h-full scrollbar-none mt-4"
        data={nodes}
        components={{
          Table: (props) => <table {...props} className="table" />,
          TableRow: (props) => <tr {...props} className="group" />,
          TableBody: (props) => <tbody {...props} className="h-fit" />,
        }}
        fixedHeaderContent={() => {
          return (
            <tr className="bg-base-300/90">
              <th>
                <label>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={deletedNodes.length === nodes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        modalStore.setDeletedNodes(
                          nodes.map((node) => ({
                            id: node.id,
                            type: node.type,
                          })),
                        );
                      } else {
                        modalStore.setDeletedNodes([]);
                      }
                    }}
                  />
                </label>
              </th>
              <th>Name</th>
              <th>Size</th>
              <th>Delete At</th>
              <th>Action</th>
            </tr>
          );
        }}
        itemContent={(index, node) => {
          const FileIcon = getFileIconByMimeType(node.mime_type);
          const isChecked = deletedNodes.some(
            (e) => e.id === node.id && e.type === node.type,
          );
          return (
            <>
              <th>
                <label>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        const filtered = deletedNodes.filter(
                          (e) => e.id !== node.id,
                        );
                        modalStore.setDeletedNodes(filtered);
                      } else {
                        const filtered = [
                          ...deletedNodes,
                          { id: node.id, type: node.type },
                        ];
                        modalStore.setDeletedNodes(filtered);
                      }
                    }}
                  />
                </label>
              </th>
              <td>
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    <div className="mask mask-squircle h-12 w-12">
                      {node.type === "FOLDER" ? (
                        <Folder className="shrink-0 fill-accent stroke-accent size-10" />
                      ) : (
                        <FileIcon className="shrink-0 size-10" />
                      )}
                    </div>
                  </div>
                  <div>
                    <Link
                      {...(node.type === "FILE"
                        ? {
                            to: ".",
                            search: (pre) => ({
                              ...pre,
                              fileId: node.media_id,
                            }),
                          }
                        : {
                            to: ".",
                            search: (pre) => ({
                              ...pre,
                              folderId: node.id,
                            }),
                          })}
                      className="font-semibold truncate"
                    >
                      {truncateText(node.name, 32)}
                    </Link>
                    <div className="text-sm opacity-50">{node.mime_type}</div>
                  </div>
                </div>
              </td>
              {node.type === "FILE" ? (
                <td className="text-nowrap">
                  {bytesToSize(node.metadata?.size ?? 4096)}
                </td>
              ) : (
                <td></td>
              )}

              <td className="min-w-16">
                {formatDateOrTime(node.deleted_at as string)}
              </td>

              <td>
                <div className="flex gap-2">
                  <div className="tooltip" data-tip="Restore">
                    <button
                      type="button"
                      className="btn btn-square btn-sm btn-ghost"
                      onClick={async () => {
                        await api.data.updateOne("nodes", node.id, {
                          // @ts-expect-error types are misrepresented
                          deleted_at: null,
                        });
                        router.invalidate();
                        toast.success(`${node.type} restored`);
                      }}
                    >
                      <RotateCcwClock size={14} />
                    </button>
                  </div>
                  <div className="tooltip" data-tip="Delete permanently">
                    <button
                      type="button"
                      className="btn btn-square btn-sm btn-ghost hover:btn-error"
                      onClick={async () => {
                        const res = await fetch("/api/delete", {
                          method: "POST",
                          body: JSON.stringify({
                            id: node.id,
                            type: node.type,
                          }),
                        });
                        const json = await res.json();
                        router.invalidate();
                        toast.info(`${node.type} deleted`);
                      }}
                    >
                      <TrashOff size={14} />
                    </button>
                  </div>
                </div>
              </td>
            </>
          );
        }}
      />
    </>
  );
}
