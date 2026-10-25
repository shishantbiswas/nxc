import {
  createFileRoute,
  Link,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import type { RepoQueryIn } from "bknd";
import { Empty } from "../../components/empty";
import { FileTile } from "../../components/file-entry";
import { FolderTile } from "../../components/folder-tile";
import { api } from "../../lib/bknd";
import "github-markdown-css/github-markdown.css";
import { useLocalStorage } from "@uidotdev/usehooks";
import { Folder, Grid3X3, TableProperties } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSnapshot } from "valtio/react";
import type { Nodes } from "../../../bknd-types";
import { NodeDropdown } from "../../components/node-dropdown";
import { getFilePreviewByMimeType } from "../../lib/get-file-preview-by-mime-type";
import { modalStore } from "../../store/modal";
import bytesToSize from "../../utils/format-bytes";
import { getTimeBasedGreeting } from "../../utils/time-based-greeting";

export const Route = createFileRoute("/_app/")({
  component: Index,
  beforeLoad: ({ search }) => search,
  loaderDeps: ({ search }) => search,
  loader: async ({ context }) => {
    const user = context.user;

    const opts: RepoQueryIn["where"] = {
      users_id: { $eq: user.id },
      deleted_at: { $isnull: true },
    };
    const count: RepoQueryIn["where"] = {
      ...(context.folderId
        ? {
            parent_id: {
              ...(context.folderId
                ? { $eq: context.folderId }
                : { $isnull: true }),
            },
          }
        : undefined),
    };
    const folderCount = await api.data.count("nodes", {
      type: { $eq: "FOLDER" },
      ...count,
      ...opts,
    });

    const fileCount = await api.data.count("nodes", {
      type: { $eq: "FILE" },
      ...count,
      ...opts,
    });

    const entries = await api.data.readMany("nodes", {
      with: ["media", "users"],
      where: {
        parent_id: {
          ...(context.folderId ? { $eq: context.folderId } : { $isnull: true }),
        },
        ...opts,
      },
      sort: {
        by: "type",
        dir: "desc",
      },
      limit: 1024,
    });

    return {
      entries: entries.data,
      fileCount: fileCount.data.count,
      folderCount: folderCount.data.count,
      isEmpty: entries.length === 0,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Home",
      },
    ],
  }),
});

function Index() {
  const { entries, isEmpty, fileCount, folderCount } = Route.useLoaderData();
  const { folderId } = Route.useSearch();
  const { user, breadcrumbs } = useRouteContext({ from: "/_app" });
  const [grid, setGrid] = useLocalStorage("layout", true);
  const { selectedNodes } = useSnapshot(modalStore);

  if (!Array.isArray(entries) || "error" in entries) {
    throw new Error(
      `Fatal Error Occoured ${entries.error ?? "entries is not a array"}`,
    );
  }
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <div></div>
        <div className="flex items-center gap-2">
          {selectedNodes.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn-sm text-sm!"
                onClick={() => modalStore.setType("FILE:MOVE")}
              >
                Move To ({selectedNodes.length})
              </button>
              <button
                type="button"
                className="btn btn-sm text-sm! btn-error"
                // onClick={() => modalStore.setType("FILE:DELETE")}
                onClick={async () => {
                  await api.data
                    .updateMany(
                      "nodes",
                      {
                        id: { $in: [...selectedNodes] },
                      },
                      { deleted_at: new Date() },
                    )
                    .then(() => {
                      toast(`Trashed ${selectedNodes.length} Files/Folder`);
                      modalStore.setSelectedNodes([]);
                      modalStore.setType(null);
                      router.invalidate();
                    })
                    .catch(() => {
                      toast.error(
                        `Error deleting ${selectedNodes.length} Files/Folder`,
                      );
                    });
                }}
              >
                Delete ({selectedNodes.length})
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

      <div className="p-4 ">
        <h2 className="text-2xl">
          {getTimeBasedGreeting()}, {user.name ?? user.email.split("@")[0]}
        </h2>
        <p
          data-empty={isEmpty}
          className="text-sm opacity-60 data-[empty=true]:hidden"
        >
          {fileCount} Files, {folderCount} Folder{" "}
          {folderId
            ? `in ${breadcrumbs[breadcrumbs.length - 1]?.name}`
            : "Total"}
        </p>
      </div>
      {isEmpty ? (
        <div className="h-[70vh] flex items-center">
          <Empty />
        </div>
      ) : grid ? (
        <NodeGrid nodes={entries} />
      ) : (
        <NodeTable nodes={entries} />
      )}
    </>
  );
}

function NodeGrid({
  nodes,
}: {
  nodes: (Omit<Nodes, "id"> & { id: string })[];
}) {
  return (
    <main className="@container mt-4  pb-18">
      <ul className="grid @sm:grid-cols-2 @lg:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6 gap-4 pb-12 md:p-0">
        {nodes?.map((node) => (
          <li
            key={node.id}
            className="flex items-center pl-0 text-nowrap min-w-0 relative"
          >
            <div className="flex items-center gap-4 min-w-0 w-full ">
              {node.type === "FOLDER" ? (
                <FolderTile folder={node} />
              ) : (
                <FileTile file={node} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

function NodeTable({
  nodes,
}: {
  nodes: (Omit<Nodes, "id"> & { id: string })[];
}) {
  const { user } = useRouteContext({ from: "/_app" });
  const { selectedNodes, setSelectedNodes } = useSnapshot(modalStore);

  return (
    <table className="table pb-12">
      <thead>
        <tr>
          <th>
            <label>
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={selectedNodes.length === nodes.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedNodes(nodes.map((node) => node.id));
                  } else {
                    setSelectedNodes([]);
                  }
                }}
              />
            </label>
          </th>
          <th>
            <button type="button" className="btn btn-sm btn-ghost">
              Name
            </button>
          </th>
          <th>
            <button type="button" className="btn btn-sm btn-ghost">
              Size
            </button>
          </th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((node) => {
          const FilePreview = getFilePreviewByMimeType({ node, user });

          return (
            <tr key={node.id} className="group">
              <th>
                <label>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedNodes.includes(node.id)}
                    onChange={() => {
                      if (selectedNodes.includes(node.id)) {
                        const filtered = selectedNodes.filter(
                          (e) => e !== node.id,
                        );
                        setSelectedNodes(filtered);
                      } else {
                        const filtered = [...selectedNodes, node.id];
                        setSelectedNodes(filtered);
                      }
                    }}
                  />
                </label>
              </th>
              <td>
                <div className="flex items-center gap-3 max-w-96 ">
                  <div className="h-12 w-12">
                    {node.type === "FOLDER" ? (
                      <Folder className="shrink-0 fill-accent stroke-accent size-10" />
                    ) : (
                      FilePreview
                    )}
                  </div>
                  <div className="min-w-0">
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
                      className="font-bold"
                    >
                      <p className="truncate">{node.name}</p>
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
                <NodeDropdown node={node} />
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <th>
            <label>
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={selectedNodes.length === nodes.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedNodes(nodes.map((node) => node.id));
                  } else {
                    setSelectedNodes([]);
                  }
                }}
              />
            </label>
          </th>
          <th>Name</th>
          <th>Size</th>
          <th>Action</th>
        </tr>
      </tfoot>
    </table>
  );
}
