import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { api } from "../../lib/bknd";
import { getFilePreviewByMimeType } from "../../lib/get-file-preview-by-mime-type";

export const Route = createFileRoute("/_app/recent")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const entries = await api.data.readMany("nodes", {
      with: ["media"],
      where: {
        type: { $eq: "FILE" },
        users_id: { $eq: context.user.id },
        deleted_at: { $isnull: true },
      },
      sort: {
        by: "created_at",
        dir: "desc",
      },
      limit: 265,
    });

    return { entries };
  },
  head: () => ({
    meta: [
      {
        title: "Recent",
      },
    ],
  }),
});

function RouteComponent() {
  const { entries } = Route.useLoaderData();
  const { user } = useRouteContext({ from: "/_app" });

  if (!Array.isArray(entries) || "error" in entries) {
    throw new Error(
      `Fatal Error Occoured ${entries.error ?? "entries is not a array"}`,
    );
  }
  return (
    <div>
      <h2 className="p-4 text-2xl">Recently uploaded files</h2>
      <ul className="list">
        {entries.map((node) => {
          // const FileIcon = getFileIconByMimeType(node.mime_type);
          const FilePreview = getFilePreviewByMimeType({ node, user });

          return (
            <li key={node.id}>
              <Link
                to="."
                search={(pre) => ({
                  ...pre,
                  fileId: node.media_id as string,
                })}
                className="list-row hover:bg-base-100/30"
              >
                <div>{FilePreview}</div>
                <div>
                  <h3>{node.name}</h3>
                  <div className="text-xs uppercase font-semibold opacity-60">
                    {new Date(node.created_at as string).toLocaleString()}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
