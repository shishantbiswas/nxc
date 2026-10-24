import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import type { RepoQueryIn } from "bknd";
import { Empty } from "../../components/empty";
import { FileTile } from "../../components/file-entry";
import { FolderTile } from "../../components/folder-tile";
import { api } from "../../lib/bknd";
import "github-markdown-css/github-markdown.css";
import { useLocalStorage } from "@uidotdev/usehooks";
import { Folder, Grid3X3, TableProperties } from "lucide-react";
import type { Nodes } from "../../../bknd-types";
import { NodeDropdown } from "../../components/node-dropdown";
import { getFilePreviewByMimeType } from "../../lib/get-file-preview-by-mime-type";
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
  if (!Array.isArray(entries) || "error" in entries) {
    throw new Error(
      `Fatal Error Occoured ${entries.error ?? "entries is not a array"}`,
    );
  }
  return (
    <>
      <div className="flex items-center justify-between">
        <div></div>
        <div>
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
    <main className="@container mt-4">
      <ul className="grid @sm:grid-cols-2 @lg:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6 gap-4 pb-12 md:p-0">
        {nodes?.map((node) => (
          <li
            key={node.id}
            className="flex items-center pl-0 text-nowrap min-w-0"
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

  return (
    <table className="table ">
      <thead>
        <tr>
          {/* <th>
            <label>
              <input type="checkbox" className="checkbox" />
            </label>
          </th> */}
          <th>Name</th>
          <th>Size</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((node) => {
          const FilePreview = getFilePreviewByMimeType({ node, user });

          return (
            <tr key={node.id} className="group">
              {/* <th>
                <label>
                  <input type="checkbox" className="checkbox" />
                </label>
              </th> */}
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
          <th>Name</th>
          <th>Size</th>
          <th>Action</th>
        </tr>
      </tfoot>
    </table>
  );
}
