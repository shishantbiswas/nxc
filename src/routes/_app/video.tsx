import { createFileRoute } from "@tanstack/react-router";
import { Empty } from "../../components/empty";
import { FileTile } from "../../components/file-entry";
import { api } from "../../lib/bknd";

export const Route = createFileRoute("/_app/video")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const entries = await api.data.readMany("nodes", {
      with: ["media"],
      where: {
        type: { $eq: "FILE" },
        users_id: { $eq: context.user.id },
        mime_type: {
          $in: [
            "video/mp4",
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/x-msvideo",
            "video/mpeg",
            "video/mpeg",
            "video/quicktime",
            "video/quicktime",
            "video/x-flv",
            "video/x-matroska",
          ],
        },
        deleted_at: { $isnull: true },
      },
      sort: {
        by: "type",
        dir: "desc",
      },
    });

    return { entries, isEmpty: entries.length > 0 };
  },
  head: () => ({
    meta: [
      {
        title: "Video",
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
    <div>
      <main className="@container mt-4">
        <ul className="grid @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 @2xl:grid-cols-5 gap-4">
          {entries?.map((file) => (
            <li
              key={file.id}
              className="flex items-center pl-0 text-nowrap min-w-0"
            >
              <div className="flex items-center gap-4 min-w-0 w-full">
                <FileTile file={file} />
              </div>
            </li>
          ))}
        </ul>
        {!isEmpty ? (
          <div className="h-[70vh] flex items-center">
            <Empty />
          </div>
        ) : null}
      </main>
      {/* <Preview /> */}
    </div>
  );
}
