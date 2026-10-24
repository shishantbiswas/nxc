import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/bknd";
import { getFileIconByMimeType } from "../../lib/get-file-icon-by-mime-type";

export const Route = createFileRoute("/_app/shared")({
  component: RouteComponent,
  loaderDeps: ({ search }) => search,
  loader: async ({ context }) => {
    const user = context.user;

    const entries = await api.data.readMany("shared", {
      with: ["owner", "nodes"],
      where: {
        owner_id: { $eq: user.id },
      },
      limit: 1024,
    });

    return {
      entries: entries.data,
      isEmpty: entries.length > 0,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Shared",
      },
    ],
  }),
});

function RouteComponent() {
  const { entries } = Route.useLoaderData();

  if (!Array.isArray(entries) || "error" in entries) {
    throw new Error(
      `Fatal Error Occoured ${entries.error ?? "entries is not a array"}`,
    );
  }
  return (
    <div>
      <h2 className="p-4 text-2xl font-semibold">Shared files and folders</h2>
      <ul className="list">
        {entries.map((share) => {
          const FileIcon = getFileIconByMimeType(share.nodes?.mime_type);

          return (
            <li key={share.id}>
              <Link
                to="."
                search={(pre) => ({
                  ...pre,
                  fileId: share.nodes?.media_id as string,
                })}
                className="list-row hover:bg-base-100/30"
              >
                <div>
                  <FileIcon className="shrink-0 size-10" />
                </div>
                <div>
                  <h3>{share.nodes?.name}</h3>
                  <div className="text-xs capitalize font-semibold opacity-60">
                    public since{" "}
                    {new Date(share.nodes?.created_at as string).toLocaleString(
                      "en",
                    )}
                    - till{" "}
                    {share.valid_till
                      ? new Date(share.valid_till as string).toLocaleString(
                          "en",
                        )
                      : "forever"}
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
