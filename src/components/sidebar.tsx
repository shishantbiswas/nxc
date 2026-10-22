import { Link, useLocation } from "@tanstack/react-router";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  ChartPie,
  Files,
  FolderPlus,
  Images,
  type LucideIcon,
  Music,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcwClock,
  Trash,
  Upload,
  Users,
  Video,
} from "lucide-react";
import { toast } from "react-hot-toast";
import useSWRImmutable from "swr/immutable";
import { useUser } from "../hooks/useUser";
import { cn } from "../utils/cn";
import bytesToSize from "../utils/format-bytes";

export function Sidebar() {
  const [open, setOpen] = useLocalStorage("sidebar", true);

  return (
    <>
      <aside
        data-expanded={open}
        className={cn(
          "min-h-full border-r hidden md:flex border-base-300/20 flex-col justify-between group transition-all shrink-0 overflow-scroll scrollbar-none",
          open ? "w-64!" : "w-18",
        )}
      >
        <div className="flex flex-col ">
          <div className="flex justify-between w-full p-4">
            <Link
              to="/"
              className="btn btn-ghost text-lg group-data-[expanded=false]:size-10 group-data-[expanded=false]:px-0"
            >
              <img alt="Logo" src="/favicon.svg" className="size-5" />
              <span className="group-data-[expanded=false]:hidden">App</span>
            </Link>
          </div>

          <div
            className="p-4 flex flex-col gap-4"
            //  className="group-data-[expanded=false]:w-fit w-full"
          >
            <button
              type="button"
              className="input input-sm input-ghost hover:bg-base-300 focus:bg-base-300 cursor-pointer transition-colors focus:outline-none group-data-[expanded=false]:hidden"
            >
              <svg
                className="hidden size-4 shrink-0 opacity-60"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
              >
                <title>Search</title>
                <g fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-.82 4.74a6 6 0 1 1 1.06-1.06l2.79 2.79a.75.75 0 1 1-1.06 1.06l-2.79-2.79Z"
                    fill="currentColor"
                  ></path>
                </g>
              </svg>
              <span className="grow text-left">Search…</span>
              <kbd className="kbd kbd-sm font-mono opacity-50">
                <span className="me-1 text-sm">⌘</span>K
              </kbd>
            </button>

            <ul
              className="space-y-2 "
              // className="menu w-full group-data-[expanded=false]:w-fit p-0 mt-6 space-y-2 "
            >
              <p className="opacity-60 mb-2.5 px-2.5 group-data-[expanded=false]:hidden">
                Navigation
              </p>
              <SidebarLink link="/" name="Files" Icon={Files} />
              <SidebarLink link="/recent" name="Recent" Icon={RotateCcwClock} />
              <SidebarLink link="/images" name="Images" Icon={Images} />
              <SidebarLink link="/music" name="Music" Icon={Music} />
              <SidebarLink link="/video" name="Video" Icon={Video} />
              <SidebarLink link="/shared" name="Shared" Icon={Users} />
            </ul>
          </div>
        </div>

        {/* <!-- Footer --> */}
        <div className="p-4 flex flex-col gap-4">
          <ul className="space-y-2">
            <li className="group-data-[expanded=false]:w-fit">
              <StorageUsed />
            </li>
            <SidebarLink link="/trash" name="Trash" Icon={Trash} />
          </ul>
          <div className="flex items-center justify-center gap-2 ">
            <User />
            <button
              onClick={() => setOpen(!open)}
              type="button"
              className="btn p-0 size-10 aspect-square"
            >
              <PanelLeftOpen
                size={16}
                className="group-data-[expanded=true]:hidden"
              />
              <PanelLeftClose
                size={16}
                className="group-data-[expanded=false]:hidden"
              />
            </button>
          </div>
        </div>
      </aside>

      <FAB />
    </>
  );
}

function FAB() {
  return (
    <div className="fab bottom-20 md:bottom-4">
      <button type="button" className="btn btn-circle btn-lg ">
        <Plus size={22} />
      </button>

      {/* <!-- buttons that show up when FAB is open --> */}
      <div className="tooltip tooltip-left" data-tip="Upload file">
        <Link
          to="."
          search={(pre) => ({ ...pre, create: "FILE" })}
          type="button"
          className="btn btn-lg btn-circle "
        >
          <Upload size={14} />
        </Link>
      </div>
      <div className="tooltip tooltip-left" data-tip="Create folder">
        <Link
          to="."
          search={(pre) => ({ ...pre, create: "FOLDER" })}
          type="button"
          className="btn btn-lg btn-circle "
        >
          <FolderPlus size={14} />
        </Link>
      </div>
      {/* <div className="tooltip" data-tip="Create Note">
        <Link
          to="."
          search={(pre) => ({ ...pre, create: "NOTE" })}
          type="button"
          className="btn btn-lg btn-circle "
        >
          <NotebookPen size={14} />
        </Link>
      </div> */}

      {/* <div className="tooltip" data-tip="Add Todo">
        <Link
          to="."
          search={(pre) => ({ ...pre, create: "TODO" })}
          type="button"
          className="btn btn-lg btn-circle "
        >
          <ListTodo size={14} />
        </Link>
      </div> */}
    </div>
  );
}

function SidebarLink({
  name,
  Icon,
  link,
}: {
  link: string;
  name: string;
  Icon: LucideIcon;
}) {
  const localtion = useLocation();
  // const [open] = useLocalStorage("sidebar", true);

  return (
    <li className="group-data-[expanded=false]:w-fit ">
      <Link
        data-tip={name}
        to={link}
        // data-active={localtion.pathname === link} tooltip hover:tooltip-open tooltip-right
        className={cn(
          "flex items-center btn font-normal  justify-start group-data-[expanded=false]:px-0 group-data-[expanded=false]:py-0 group-data-[expanded=false]:p-2.5 gap-6 group-data-[expanded=false]:size-10 group border-0 ",
          localtion.pathname === link
            ? "menu-active font-semibold btn-soft btn-neutral"
            : "btn-ghost",
        )}
      >
        <Icon
          size={16}
          className="group-data-[expanded=false]:size-6 group-data-[active=true]:stroke-[2.5px]"
        />
        <span className="group-data-[expanded=false]:hidden">{name}</span>
      </Link>
    </li>
  );
}

function User() {
  const { isError, isLoading, user } = useUser();

  if (isLoading) return <p>Loading...</p>;
  if (!user || isError) return null;
  return (
    <div className="flex justify-between items-center group-data-[expanded=false]:hidden w-full">
      <Link className="btn w-full" to="/account">
        <div className="flex flex-col text-start w-full">
          <span className="font-bold"></span>
          <span className="text-sm opacity-60">
            {user?.name ?? user?.email.split("@")[0]}
          </span>
        </div>
      </Link>
    </div>
  );
}

function StorageUsed() {
  const [isOpen] = useLocalStorage("sidebar", false);

  const { data, error, isLoading, isValidating, mutate } = useSWRImmutable(
    "/api/storage-usage",
    async (url) => fetch(url).then((res) => res.json()),
  );

  if (error) {
    toast.error("Failed to load Storage info");
    return;
  }

  const loading = isLoading && isValidating;

  return (
    <button
      onClick={() => {
        mutate();
        toast(`${bytesToSize(data?.size.total_size)} in use`)
      }}
      disabled={loading}
      className={
        isOpen
          ? "btn btn-ghost w-full justify-start gap-6" : "btn btn-ghost btn-square"
          // : "tooltip hover:tooltip-open tooltip-right size-10 p-3 w-full "
      }
      type="button"
      data-tip={bytesToSize(data?.size.total_size)}
    >
      {isOpen ? (
        <>
          <ChartPie size={16} />{" "}
          <p className="text-sm">{bytesToSize(data?.size.total_size)}</p>
        </>
      ) : (
        <ChartPie size={16} />
      )}
    </button>
  );
}
