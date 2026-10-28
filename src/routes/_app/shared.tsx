import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/bknd";
import { getFileIconByMimeType } from "../../lib/get-file-icon-by-mime-type";

export const Route = createFileRoute("/_app/shared")({
  component: RouteComponent,
  loaderDeps: ({ search }) => search,
  loader: async ({ context }) => {
    const user = context.user;

    const sharedToOther = await api.data.readMany("shared", {
      with: ["owner", "nodes"],
      where: {
        owner_id: { $eq: user.id },
      },
      limit: 1024,
    });

    const sharedByOther = await api.data.readMany("shared", {
      with: ["owner", "nodes"],
      where: {
        receiver_id: { $eq: user.id },
      },
      limit: 1024,
    });

    return {
      sharedToOther: sharedToOther.data,
      sharedByOther: sharedByOther.data,
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
  const { sharedByOther, sharedToOther } = Route.useLoaderData();

  if (
    !Array.isArray(sharedToOther) ||
    !Array.isArray(sharedByOther) ||
    "error" in sharedToOther ||
    "error" in sharedByOther
  ) {
    throw new Error(`Fatal Error Occoured data is not a array`);
  }

  return (
    <div className="p-4 ">
      <h2 className="text-2xl font-semibold">File/Folder you shared</h2>
      <ul className="list mt-4">
        {sharedToOther.map((share) => {
          const FileIcon = getFileIconByMimeType(share.nodes?.mime_type);

          return (
            <li key={share.id}>
              <Link
                to="."
                search={(pre) => ({
                  ...pre,
                  fileId: share.nodes?.media_id as string,
                })}
                className="list-row hover:bg-base-100/30 p-2"
              >
                <div>
                  <FileIcon className="shrink-0 size-10" />
                </div>
                <div>
                  <h3>{share.nodes?.name}</h3>
                  <div className="text-xs capitalize font-semibold opacity-60">
                    Shared since{" "}
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

      <h2 className="text-2xl font-semibold mt-12">File/Folder shared by other to you</h2>
      <ul className="list">
        {sharedByOther.map((share) => {
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
