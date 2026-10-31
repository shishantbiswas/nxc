import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  ChartPie,
  Files,
  Images,
  type LucideIcon,
  Music,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcwClock,
  Trash,
  Video,
} from "lucide-react";
import { toast } from "react-hot-toast";
import useSWRImmutable from "swr/immutable";
import { useUser } from "../hooks/useUser";
import { modalStore } from "../store/modal";
import { cn } from "../utils/cn";
import bytesToSize from "../utils/format-bytes";
import { FAB } from "./fab";
import { MusicPlayer } from "./music-player";

export function Sidebar() {
  const [open, setOpen] = useLocalStorage("sidebar", true);
  const { user } = useRouteContext({ from: "/_app" });

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
              className="btn w-full group-data-[expanded=true]:justify-start group-data-[expanded=true]:gap-4 btn-ghost text-lg group-data-[expanded=false]:size-10 group-data-[expanded=false]:px-0"
            >
              <img
                alt="Logo"
                src={user.preferences?.favicon ?? "/favicon.svg"}
                className="size-5"
              />
              <span className="group-data-[expanded=false]:hidden">App</span>
            </Link>
          </div>

          <div
            className="p-4 flex flex-col gap-4"
            //  className="group-data-[expanded=false]:w-fit w-full"
          >
            <button
              type="button"
              onClick={() => modalStore.setType("SEARCH")}
              className="input input-sm input-ghost hover:bg-base-300 focus:bg-base-300 cursor-pointer transition-colors focus:outline-none group-data-[expanded=false]:hidden"
            >
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
              <MusicPlayer mini />
              <SidebarLink link="/video" name="Video" Icon={Video} />
              {/* <SidebarLink link="/shared" name="Shared" Icon={Users} /> */}
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

  const {
    data: total_size,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWRImmutable<number>("/api/storage-usage", async (url: string) =>
    fetch(url).then(async (res) => {
      const data = (await res.json()) as {
        size: { total_size: number };
      };
      if (data.size.total_size) return Number(data.size.total_size);
      return 0;
    }),
  );

  if (error) {
    toast.error("Failed to load Storage info");
    return;
  }

  const loading = isLoading && isValidating;

  return (
    <button
      onClick={() => {
        mutate().then((total_size) => {
          toast(`${bytesToSize(total_size)} in use`);
        });
      }}
      disabled={loading}
      className={
        isOpen
          ? "btn btn-ghost w-full justify-start gap-6"
          : "btn btn-ghost btn-square"
        // : "tooltip hover:tooltip-open tooltip-right size-10 p-3 w-full "
      }
      type="button"
      data-tip={bytesToSize(total_size)}
    >
      {isOpen ? (
        <>
          <ChartPie size={16} />{" "}
          <p className="text-sm">{bytesToSize(total_size)}</p>
        </>
      ) : (
        <ChartPie size={16} />
      )}
    </button>
  );
}
