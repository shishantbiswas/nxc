import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Folder, RotateCcwClock, TrashOff } from "lucide-react";
import type { Nodes } from "../../../bknd-types";
import { Empty } from "../../components/empty";
import { useToast } from "../../components/toast-provider";
import { api } from "../../lib/bknd";
import formatDateOrTime from "../../lib/format-date-time";
import { getFileIconByMimeType } from "../../lib/get-file-icon-by-mime-type";
import bytesToSize from "../../utils/format-bytes";

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
      limit: 256,
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

  return (
    <table className="table">
      {/* head */}
      <thead>
        <tr>
          {/* <th>
            <label>
              <input type="checkbox" className="checkbox" />
            </label>
          </th> */}
          <th>Name</th>
          <th>Size</th>
          <th>Delete At</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((node) => {
          const FileIcon = getFileIconByMimeType(node.mime_type);

          return (
            <tr key={node.id} className="group">
              {/* <th>
                <label>
                  <input type="checkbox" className="checkbox" />
                </label>
              </th> */}
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
                      {node.name}
                    </Link>
                    <div className="text-sm opacity-50">{node.mime_type}</div>
                  </div>
                </div>
              </td>
              {node.type === "FILE" ? (
                <td>{bytesToSize(node.metadata.size)}</td>
              ) : (
                <td></td>
              )}

              <td className="min-w-16">
                {formatDateOrTime(node.deleted_at as string)}
              </td>

              <td className="flex gap-2">
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
                      alert("Are you sure about that ?");
                      const res = await fetch("/api/delete", {
                        method: "POST",
                        body: JSON.stringify({ id: node.id, type: node.type }),
                      });
                      const json = await res.json();
                      // console.log({ json });
                      router.invalidate();
                      toast.info(`${node.type} deleted`);
                    }}
                  >
                    <TrashOff size={14} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
      {/* foot */}
      {/* <tfoot>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Size</th>
            <th>Delete At</th>
            <th>Action</th>
          </tr>
        </tfoot> */}
    </table>
  );
}
