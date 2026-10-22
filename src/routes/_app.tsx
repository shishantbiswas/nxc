import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  Folder,
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
} from "lucide-react";
import { useState } from "react";
import { Drawer } from "vaul";
import { z } from "zod";
import { CreateModal } from "../components/create-modal";
import { PreviewFile } from "../components/preview";
import { Sidebar } from "../components/sidebar";
import { useTheme } from "../components/theme-provider";
import { UploadIndicator } from "../components/upload-progress-badge";
import { api } from "../lib/bknd";
import { cn } from "../utils/cn";

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
});

function AppLayout() {
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
        <div className=" md:h-[calc(100vh-2rem)]! flex bg-base-100/60 backdrop-blur-xl  md:rounded-xl overflow-hidden">
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
    </div>
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
    <div className="dock bg-transparent md:hidden rounded-none">
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
        <Link to="." search={{ create: "FILE" }}>
          <button
            type="button"
            className="btn btn-sm btn-ghost hover:btn-soft btn-square tooltip tooltip-bottom"
            data-tip={"New File"}
          >
            <Plus className="size-5 swap-off" />
          </button>
        </Link>
        <Link to="." search={{ create: "FOLDER" }}>
          <button
            type="button"
            className="btn btn-sm btn-ghost hover:btn-soft btn-square tooltip tooltip-bottom"
            data-tip={"New Folder"}
          >
            <FolderPlus className="size-5 swap-off" />
          </button>
        </Link>
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
