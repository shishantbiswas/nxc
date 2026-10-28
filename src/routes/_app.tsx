import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import { useDebounce, useLocalStorage } from "@uidotdev/usehooks";
import {
  Folder,
  FolderInput,
  FolderPlus,
  House,
  Images,
  type LucideIcon,
  MenuIcon,
  Moon,
  Music,
  Plus,
  RotateCcwClock,
  Settings,
  Sun,
  Trash,
  UploadCloud,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import useSWR from "swr";
import { useSnapshot } from "valtio/react";
import { Drawer } from "vaul";
import { z } from "zod";
import type { Nodes } from "../../bknd-types";
import { CreateModal } from "../components/create-modal";
import { PreviewFile } from "../components/preview";
import { Sidebar } from "../components/sidebar";
import { useTheme } from "../components/theme-provider";
import { UploadIndicator } from "../components/upload-progress-badge";
import { api } from "../lib/bknd";
import { getFilePreviewByMimeType } from "../lib/get-file-preview-by-mime-type";
import { type ModalType, modalStore } from "../store/modal";
import { cn } from "../utils/cn";
import { truncateText } from "../utils/truncate-text";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
  validateSearch: z.object({
    fileId: z.string().optional(),
    folderId: z.string().optional(),
    create: z.enum(["FOLDER", "FILE"]).optional(),
  }),
  beforeLoad: async ({ search }) => {
    const folderId = search.folderId;
    const user = await api.auth.me();

    if (!user.user?.email) {
      throw redirect({ to: "/admin/auth/login" as string });
    }

    let breadcrumbs: { id: string; name: string }[] = [];
    if (folderId) {
      const req = await fetch(
        `/api/data/breadcrumbs?folderId=${folderId}`,
      ).then(async (res) => await res.json());
      breadcrumbs = req.data as {
        id: string;
        name: string;
      }[];
    }

    return {
      user: user.user,
      breadcrumbs,
    };
  },
  head: ({ match }) => {
    const customIcon = match.context.user.preferences?.favicon;
    return {
      links: [
        {
          rel: "icon",
          href: customIcon ?? "/favicon.svg",
        },
      ],
    };
  },
});

function AppLayout() {
  // useEffect(() => {
  //   let wakeLock: WakeLockSentinel | null = null;
  //   const unsubscribe = subscribe(uploadStore, async () => {
  //     const tasks = Object.values(uploadStore.tasks);
  //     if (tasks.length === 0) return;
  //     const completed = tasks.every((t) => t.status === "completed");
  //     const isUploading = tasks.some((t) => t.status === "uploading");
  //     if (isUploading && !wakeLock) {
  //       try {
  //         wakeLock = await navigator.wakeLock.request("screen");
  //       } catch (err) {
  //         console.error("Wake lock request denied or failed:", err);
  //       }
  //     } else if (completed && wakeLock) {
  //       await wakeLock.release();
  //       wakeLock = null;
  //     }
  //   });
  //   return () => {
  //     unsubscribe();
  //     if (wakeLock) {
  //       wakeLock.release().catch(() => {});
  //     }
  //   };
  // }, []);

  const [sidebar] = useLocalStorage("sidebar", true);
  const { user } = Route.useRouteContext();
  return (
    <div className="min-w-screen min-h-screen">
      <img
        className="-z-50 absolute w-screen h-screen object-cover"
        src={user.preferences?.wallpaper ?? "/wallpaper/1.jpg"}
        alt=""
      />
      <main className="h-screen md:p-4 z-50">
        <div className=" md:h-[calc(100vh-2rem)]! flex bg-base-100/60 backdrop-blur-xl md:rounded-xl overflow-hidden">
          <Sidebar />
          <section className="w-full h-screen relative">
            <Topbar />
            <div
              className={cn(
                "p-2 md:p-4 overflow-auto scrollbar-none md:h-[calc(100vh-9rem)] h-[calc(100vh-5.8rem)]",
                sidebar
                  ? "md:w-[calc(100vw-18rem)]"
                  : "md:w-[calc(100vw-6.5rem)]",
              )}
            >
              <Outlet />
            </div>
          </section>
        </div>
      </main>
      <MobileDock />
      <PreviewFile />
      <CreateModal />
      <SearchModal />
      <FileOpsModal />
    </div>
  );
}

function FileOpsModal() {
  const { type, selectedNodes } = useSnapshot(modalStore);
  const [move, setMove] = useState<null | { id: string | null; name: string }>(
    null,
  );
  const router = useRouter();
  const { data } = useSWR(type, async (type: ModalType) => {
    if (type !== "FILE:MOVE") return;
    const { data } = await api.data.readMany("nodes", {
      select: ["name", "id"],
      where: {
        type: "FOLDER",
      },
    });
    return data;
  });

  return (
    <dialog
      className={cn(
        "modal",
        ["FILE:MOVE"].includes(type ?? "") && "modal-open",
      )}
    >
      {/** biome-ignore lint/a11y/noStaticElementInteractions: modal needs to be in focus */}
      <div
        tabIndex={-1}
        ref={(e) => e?.focus()}
        className="modal-box p-0 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            modalStore.setType(null);
          }
        }}
      >
        <div className="flex flex-col p-4">
          <h1 className="text-2xl font-semibold">Confirm Action</h1>
          <p className="text-sm opacity-70">
            Are you sure ? This actions can not be undone
          </p>
          {type === "FILE:MOVE" && (
            <fieldset className="fieldset text-sm my-4">
              <legend className="fieldset-legend">Folders</legend>
              <select
                defaultValue="Pick a Folder"
                className="select w-full "
                onChange={(e) => {
                  if (e.target.value === "Home") {
                    setMove({ id: null, name: "Home" });
                  } else {
                    setMove(
                      data?.find((ext) => ext.name === e.target.value) || null,
                    );
                  }
                }}
              >
                <option disabled={true}>Pick a Folder</option>
                <option>Home</option>
                {data?.map((it) => (
                  <option key={it.id}>{it.name}</option>
                ))}
              </select>
            </fieldset>
          )}
          <div className="flex gap-2 justify-end">
            {/* {type === "FILE:DELETE" && (
              <button
                type="button"
                className="btn btn-error"
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
                <Trash size={14} />
                Delete ({selectedNodes.length})
              </button>
            )} */}
            {move && (
              <button
                type="button"
                className="btn btn-info"
                onClick={async () => {
                  const selfInsert = selectedNodes.includes(move.id ?? "");
                  if (selfInsert) {
                    toast.error("Can't move folder in itself");
                    return;
                  }

                  await api.data
                    .updateMany(
                      "nodes",
                      {
                        id: { $in: [...selectedNodes] },
                      },
                      // @ts-expect-error false positive
                      { parent_id: move.id },
                    )
                    .then(() => {
                      toast.success(
                        `Moved ${selectedNodes.length} Files/Folder`,
                      );
                      modalStore.setSelectedNodes([]);
                      modalStore.setType(null);
                      router.invalidate();
                    })
                    .catch(() => {
                      toast.error(
                        `Error moving ${selectedNodes.length} Files/Folder`,
                      );
                    });
                }}
              >
                <FolderInput size={14} />
                Move
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => {
                modalStore.setType(null);
              }}
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop backdrop-blur-xs flex flex-col">
        <div></div>
        <button
          type="button"
          className="min-h-[calc(100%-3rem)]"
          onClick={() => {
            modalStore.setType(null);
          }}
        >
          close
        </button>
      </div>
    </dialog>
  );
}
function SearchModal() {
  const { type } = useSnapshot(modalStore);
  const [q, setQ] = useState<null | string>(null);
  const debouncedSearch = useDebounce<null | string>(q, 200);

  const { data, isLoading, error, isValidating } = useSWR(
    debouncedSearch,
    (term) =>
      fetch(`/api/search?q=${term}`).then(
        (e) =>
          e.json() as Promise<{
            result: (Omit<Nodes, "id"> & { id: string })[];
          }>,
      ),
  );

  const isPending = isLoading && isValidating;
  const { user } = useRouteContext({ from: "/_app" });
  return (
    <dialog className={cn("modal", type === "SEARCH" && "modal-open")}>
      {/** biome-ignore lint/a11y/noStaticElementInteractions: modal needs to be in focus */}
      <div
        tabIndex={-1}
        ref={(e) => e?.focus()}
        className="modal-box bg-base-200/80 p-0 focus:outline-none max-w-5xl max-h-[60vh] "
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            modalStore.setType(null);
          }
        }}
      >
        <div className="flex flex-col gap-4 p-6 @container">
          <div className="flex justify-between">
            <h1 className="text-3xl opacity-80 font-semibold">Search</h1>
            <button
              type="button"
              className="btn btn-error btn-square"
              onClick={() => modalStore.setType(null)}
            >
              <X />
            </button>
          </div>
          <input
            type="text"
            className="input bg-neutral z-50 w-full sticky top-4"
            placeholder="Start typing to see results"
            onChange={(e) => {
              if (e.target.value.trim().length === 0) {
                setQ(null);
              }
              setQ(e.target.value);
            }}
          />
          <ul className="grid @sm:grid-cols-2 @3xl:grid-cols-3">
            {data?.result?.map((node) => {
              const FilePreview = getFilePreviewByMimeType({
                user,
                node: node,
                previewClassName: "h-32! w-full object-cover rounded",
                iconClassName: "h-28! py-4 w-full object-cover rounded",
              });
              return (
                <li
                  key={node.id}
                  className="hover:bg-neutral/20 rounded-lg w-full group p-3"
                >
                  <Link
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
                    onClick={() => {
                      modalStore.setType(null);
                    }}
                  >
                    {node.type === "FILE" ? (
                      FilePreview
                    ) : (
                      <Folder className="h-22! my-7 w-full object-cover rounded" />
                    )}
                    <p className="truncate min-w-0 flex-1 mt-2 opacity-80 text-md">
                      {truncateText(node.name, 24)}
                    </p>
                  </Link>
                </li>
              );
            })}

            {isPending && <div>Loading...</div>}
            {error && <div>{error}</div>}
          </ul>
        </div>
      </div>
      <div className="modal-backdrop backdrop-blur-xs flex flex-col">
        <div></div>
        <button
          type="button"
          className="min-h-[calc(100%-3rem)]"
          onClick={() => {
            modalStore.setType(null);
          }}
        >
          close
        </button>
      </div>
    </dialog>
  );
}

function MobileDrawer({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-base-content/40" />
        <Drawer.Content className="h-fit fixed bottom-0 left-0 right-0 outline-none z-500 bg-base-100 backdrop-blur-sm rounded-t-[10px]">
          <div className="p-4 flex-1">
            <div
              aria-hidden
              className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-base-300 mb-8"
            />

            <nav className="flex-1 overflow-y-auto ">
              <h1 className="pl-6 font-semibold text-2xl mb-8">Menu</h1>
              <p></p>
              <ul className="grid space-y-4 transition-[grid-template-rows] duration-300 ease-out menu w-full">
                <DockLink
                  Icon={House}
                  link="/"
                  name="Home"
                  onClick={() => setOpen(false)}
                />
                <DockLink
                  Icon={Music}
                  link="/music"
                  name="Music"
                  onClick={() => setOpen(false)}
                />
                <DockLink
                  Icon={Video}
                  link="/video"
                  name="Video"
                  onClick={() => setOpen(false)}
                />
                <DockLink
                  Icon={Images}
                  link="/images"
                  name="Images"
                  onClick={() => setOpen(false)}
                />
                <DockLink
                  Icon={RotateCcwClock}
                  link="/recent"
                  name="Recently Added"
                  onClick={() => setOpen(false)}
                />
                <DockLink
                  Icon={Users}
                  onClick={() => setOpen(false)}
                  link="/shared"
                  name="Shared/Public"
                />
                <DockLink
                  Icon={UploadCloud}
                  onClick={() => setOpen(false)}
                  link="/uploads"
                  name="Manage Uploads"
                />
                <DockLink
                  onClick={() => setOpen(false)}
                  Icon={User}
                  link="/account"
                  name="Account Management"
                />
                <DockLink
                  Icon={Trash}
                  link="/trash"
                  name="Trash"
                  onClick={() => setOpen(false)}
                  type="error"
                />
              </ul>
            </nav>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
function DockLink({
  name,
  Icon,
  link,
  type,
  onClick,
}: {
  link: string;
  name: string;
  type?: "error" | "success";
  Icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        onClick={onClick}
        to={link}
        className={cn(
          "btn btn-ghost justify-start w-full gap-4",
          type === "error" ? "btn-error" : "",
        )}
      >
        <Icon size={16} />
        <p>{name}</p>
      </Link>
    </li>
  );
}
function MobileDock() {
  const localtion = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dock md:hidden rounded-none">
      <Link to="/" className={cn(localtion.pathname === "/" && "dock-active")}>
        <button
          type="button"
          className="flex flex-col gap-px items-center justify-center"
        >
          <House size={16} />
          <span className="dock-label">Home</span>
        </button>
      </Link>

      <Link
        to="/account"
        className={cn(localtion.pathname === "/account" && "dock-active")}
      >
        <button
          type="button"
          className="flex flex-col gap-px items-center justify-center"
        >
          <Settings size={16} />
          <span className="dock-label">Settings</span>
        </button>
      </Link>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col gap-px items-center justify-center"
      >
        <MenuIcon size={16} />
        <span className="dock-label">More</span>
      </button>
      <MobileDrawer open={isOpen} setOpen={setIsOpen} />
    </div>
  );
}

function Topbar() {
  const { theme, setTheme } = useTheme();
  const { breadcrumbs } = Route.useRouteContext();

  return (
    <div className="navbar w-full flex items-center border-b border-base-300/20 rounded-tr-xl sticky top-0">
      <div className="breadcrumbs text-sm ml-2 md:ml-4 flex-1">
        <ul>
          <li>
            <Link to="/">
              <Folder size={12} />
              Home
            </Link>
          </li>
          {breadcrumbs?.map(({ id, name }) => (
            <li key={id}>
              <Link
                to="."
                search={(pre) => ({
                  ...pre,
                  folderId: id,
                })}
              >
                <Folder size={12} />
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-center gap-4">
        {/* <Link to="." search={(pre) => ({ ...pre, create: "FILE" })}> */}
        <button
          type="button"
          className="btn btn-sm btn-ghost hover:btn-soft btn-square tooltip tooltip-bottom"
          data-tip={"New File"}
          onClick={() => {
            modalStore.setType("FILE:UPLOAD");
          }}
        >
          <Plus className="size-5 swap-off" />
        </button>
        {/* </Link> */}
        {/* <Link to="." search={(pre) => ({ ...pre, create: "FOLDER" })}> */}
        <button
          type="button"
          className="btn btn-sm btn-ghost hover:btn-soft btn-square tooltip tooltip-bottom"
          data-tip={"New Folder"}
          onClick={() => {
            modalStore.setType("FOLDER:UPLOAD");
          }}
        >
          <FolderPlus className="size-5 swap-off" />
        </button>
        {/* </Link> */}
        <UploadIndicator />
        <button
          type="button"
          onClick={() => {
            setTheme(theme === "light" ? "dark" : "light");
          }}
          className="btn btn-sm btn-ghost hover:btn-soft btn-square tooltip tooltip-bottom"
          data-tip="Theme"
        >
          {theme === "light" ? (
            <Sun className="size-5 swap-on" />
          ) : (
            <Moon className="size-5 swap-off" />
          )}
        </button>

        <Link to="/account">
          <button
            type="button"
            className="btn btn-sm btn-ghost hover:btn-soft btn-square tooltip tooltip-bottom tooltip-end"
            data-tip="Account"
          >
            <User className="size-5 swap-off" />
          </button>
        </Link>
      </div>
    </div>
  );
}
