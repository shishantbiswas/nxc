import { Link, useRouteContext, useRouter } from "@tanstack/react-router";
import {
  Badge,
  DoorOpen,
  Download,
  Ellipsis,
  ImagePlus,
  PencilLine,
  Share,
  Trash,
  Wallpaper,
} from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import { nanoid } from "nanoid";
import { useState } from "react";
import DatePicker from "react-datepicker";
import { toast } from "react-hot-toast";
import type { Nodes } from "../../bknd-types";
import { api } from "../lib/bknd";
import { cn } from "../utils/cn";

export function NodeDropdown({
  node,
}: {
  node: Omit<Nodes, "id"> & {
    id: string;
  };
}) {
  const router = useRouter();
  const { user } = useRouteContext({ strict: false });
  const [modal, setModal] = useState<"rename" | "share" | null>();

  return (
    <>
      <div className="dropdown dropdown-hover dropdown-end not-group-hover:hidden">
        <button
          type="button"
          className="hidden group-hover:block hover:cursor-pointer"
        >
          <Ellipsis />
        </button>

        <ul
          tabIndex={-1}
          className="dropdown-content gap-2 menu bg-base-100 rounded-box z-1 min-w-32 p-2 shadow-sm"
        >
          <Link
            className="w-full"
            to="."
            {...(node.type === "FILE"
              ? {
                  search: (pre) => ({
                    ...pre,
                    fileId: node.media_id,
                  }),
                }
              : {
                  search: (pre) => ({
                    ...pre,
                    folderId: node.id,
                  }),
                })}
          >
            <button
              type="button"
              className="btn btn-sm btn-ghost justify-start gap-4 w-full"
            >
              <DoorOpen size={14} /> Open
            </button>
          </Link>

          {node.type === "FILE" && (
            <button
              type="button"
              className="btn btn-sm btn-ghost justify-start gap-4"
              onClick={() => {
                const link = document.createElement("a");
                link.href = `/api/media/file/${node.media?.path}`;
                link.download = node.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download size={14} />
              Download
            </button>
          )}

          {[
            "image/webp",
            "image/jpg",
            "image/jpeg",
            "image/svg+xml",
            "image/gif",
            "image/avif",
            "image/png",
          ].includes(node.mime_type ?? "") && (
            <div className="dropdown w-full dropdown-left dropdown-hover dropdown-center">
              <button
                type="button"
                className="btn btn-sm btn-ghost justify-start gap-4 w-full"
              >
                <ImagePlus size={14} />
                Set as
              </button>
              <ul
                tabIndex={-1}
                className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
              >
                <li>
                  <button
                    type="button"
                    className="gap-4"
                    onClick={async () => {
                      if (node.type !== "FILE" || !user?.id) {
                        return;
                      }
                      await api.data.updateOne("users", user?.id as string, {
                        preferences: {
                          ...user?.preferences,
                          favicon: `/api/media/file/${node.media?.path}`,
                        },
                      });
                      toast.success("Updated favicon");
                      router.invalidate();
                    }}
                  >
                    <Badge size={14} />
                    Favicon
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="gap-4"
                    onClick={async () => {
                      if (node.type !== "FILE" || !user?.id) {
                        return;
                      }
                      await api.data.updateOne("users", user?.id as string, {
                        preferences: {
                          ...user?.preferences,
                          wallpaper: `/api/media/file/${node.media?.path}`,
                        },
                      });
                      toast.success("Updated wallpaper");
                      router.invalidate();
                    }}
                  >
                    <Wallpaper size={14} /> Wallpaper
                  </button>
                </li>
              </ul>
            </div>
          )}
          <button
            type="button"
            className="btn btn-sm btn-ghost justify-start gap-4"
            onClick={() => setModal("rename")}
          >
            <PencilLine size={14} />
            Rename
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost justify-start gap-4"
            onClick={() => setModal("share")}
          >
            <Share size={14} />
            Share
          </button>
          <button
            type="button"
            onClick={async () => {
              await api.data.updateOne("nodes", node.id, {
                deleted_at: new Date(),
              });
              router.invalidate();
              toast.success(`${node.type} deleted`);
            }}
            className="btn hover:btn-error btn-sm btn-ghost justify-start gap-4"
          >
            <Trash size={14} />
            Delete
          </button>
        </ul>
      </div>
      <RenameModal
        node={node}
        isOpen={modal === "rename"}
        close={() => setModal(null)}
      />

      <ShareModal
        node={node}
        isOpen={modal === "share"}
        close={() => setModal(null)}
      />
    </>
  );
}

function RenameModal({
  node,
  isOpen,
  close,
}: {
  isOpen: boolean;
  close: () => void;
  node: Omit<Nodes, "id"> & {
    id: string;
  };
}) {
  const router = useRouter();

  return (
    <div className={cn("modal", isOpen && "modal-open")}>
      {/** biome-ignore lint/a11y/noStaticElementInteractions: modal needs to be interactive div */}
      <div
        tabIndex={-1}
        ref={(e) => e?.focus()}
        className="modal-box p-0 focus:outline-none w-fit max-w-[80vw] max-h-[80vh]"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const name = formData.get("name");
            if (!name) {
              toast.error("name is required");
              return;
            }
            await api.data.updateOne("nodes", node.id, {
              name: name as string,
            });

            toast.success(`renamed to ${name}`);
            router.invalidate();
            close();
          }}
          className="flex flex-col gap-4 p-4 w-96"
        >
          <input
            type="text"
            defaultValue={node.name}
            className="input w-full"
            name="name"
          />

          <button type="submit" className="btn btn-primary capitalize w-full">
            Rename
          </button>
        </form>
      </div>
      <div className="modal-backdrop  flex flex-col">
        <div className={cn("h-12 bg-black/10", !isOpen && "hidden")}></div>
        <button
          type="button"
          className="min-h-[calc(100%-3rem)]"
          onClick={() => close()}
        >
          close
        </button>
      </div>
    </div>
  );
}

function ShareModal({
  node,
  isOpen,
  close,
}: {
  isOpen: boolean;
  close: () => void;
  node: Omit<Nodes, "id"> & {
    id: string;
  };
}) {
  const router = useRouter();
  const { user } = useRouteContext({ from: "/_app" });
  const [startDate, setStartDate] = useState<Date | null>(null);
  return (
    <div className={cn("modal", isOpen && "modal-open")}>
      {/** biome-ignore lint/a11y/noStaticElementInteractions: modal needs to be interactive div */}
      <div
        tabIndex={-1}
        ref={(e) => e?.focus()}
        className="modal-box p-0 focus:outline-none w-fit max-w-[80vw] max-h-[80vh] overflow-visible"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            await api.data.createOne("shared", {
              nodes_id: node.id,
              users_id: user.id as string,
              token: nanoid(),
              valid_till: startDate ?? undefined,
            });
            toast.success(`${node.name} is now shared`);
            router.invalidate();
            close();
          }}
          className="flex flex-col gap-4 p-4 min-w-24"
        >
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            showTimeSelect
            timeFormat="HH:mm"
            // timeIntervals={15}
            timeCaption="time"
            dateFormat="MMMM d, yyyy h:mm aa"
            className="input w-full"
            popperClassName="w-96"
            calendarClassName="w-fit"
          />
          <button type="submit" className="btn btn-primary capitalize w-full">
            Share
          </button>
        </form>
      </div>
      <div className="modal-backdrop  flex flex-col">
        <div className={cn("h-12 bg-black/10", !isOpen && "hidden")}></div>
        <button
          type="button"
          className="min-h-[calc(100%-3rem)]"
          onClick={() => close()}
        >
          close
        </button>
      </div>
    </div>
  );
}
