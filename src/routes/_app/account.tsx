import {
  createFileRoute,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import { useLocalStorage } from "@uidotdev/usehooks";
import type { SafeUser } from "bknd";
// import { hash } from "bknd/utils";
// import { toast } from "react-hot-toast";
import { api } from "../../lib/bknd";

export const Route = createFileRoute("/_app/account")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Account",
      },
    ],
  }),
});

function RouteComponent() {
  const { user } = useRouteContext({ from: "/_app" });
  const hashWithoutSymbol = window.location.hash.substring(1) || "security";

  return (
    <div className="p-4">
      <div className="tabs tabs-box bg-base-100/50">
        <input
          type="radio"
          name="user"
          className="tab"
          aria-label="Security"
          defaultChecked={hashWithoutSymbol === "security"}
          onClick={() => {
            window.location.hash = "security";
          }}
        />
        <Security user={user} />

        <input
          type="radio"
          name="user"
          className="tab"
          aria-label="Appearance"
          defaultChecked={hashWithoutSymbol === "appearance"}
          onClick={() => {
            window.location.hash = "appearance";
          }}
        />
        <Appearance user={user} />

        <input
          type="radio"
          name="user"
          defaultChecked={hashWithoutSymbol === "preferences"}
          onClick={() => {
            window.location.hash = "preferences";
          }}
          className="tab"
          aria-label="Preferences"
        />
        <Preferences user={user} />
        {/* <input
          type="radio"
          name="user"
          defaultChecked={hashWithoutSymbol === "members"}
          onClick={() => {
            window.location.hash = "members";
          }}
          className="tab"
          aria-label="Members"
        />
        <Members user={user} /> */}
      </div>
    </div>
  );
}

function Appearance({ user }: { user: SafeUser }) {
  const router = useRouter();
  const [tileStyle, setTileStyle] = useLocalStorage<"portrait" | "landscape">(
    "tile-style",
    "portrait",
  );
  return (
    <div className="tab-content p-2 space-y-6">
      <div className="flex justify-between">
        <div>
          <h4 className="text-lg font-semibold">Select Wallpaper</h4>
          <p className="opacity-70 text-sm">Chose a wallpaper</p>
        </div>

        <div className="grid gap-2 grid-cols-3">
          {[...Array.from(Array(6).keys())].map((num) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
            <img
              key={num}
              src={`/wallpaper/${num + 1}.jpg`}
              alt="wallpapers"
              className="size-28 object-cover rounded cursor-pointer"
              onClick={async () => {
                await api.data.updateOne("users", user.id, {
                  preferences: {
                    ...user.preferences,
                    wallpaper: `/wallpaper/${num + 1}.jpg`,
                  },
                });
                router.invalidate();
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <div>
          <h4 className="text-lg font-semibold">Tile Style</h4>
          <p className="opacity-70 text-sm">
            Customize the style of each Tile in Grid
          </p>
        </div>
        <select
          defaultValue={tileStyle}
          className="select"
          onChange={(e) =>
            setTileStyle(e.target.value.toLocaleLowerCase() as any)
          }
        >
          <option>Portrait</option>
          <option>Landscape</option>
          <option>Text Bottom</option>
          {/* <option>Text Top</option> */}
        </select>
      </div>
    </div>
  );
}

function Security({ user }: { user: SafeUser }) {
  const router = useRouter();
  return (
    <div className="tab-content p-2">
      <div className="flex justify-between">
        <div>
          <h4 className="text-lg font-semibold">Change password</h4>
          <p className="opacity-70 text-sm">Update password</p>
        </div>
        <form
          className="join"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            // await api.data
            //   .updateOne("users", user.id, {
            //     strategy_value: await hash.sha256(
            //       form.get("password") as string,
            //     ),
            //   })
            //   .then(async (e) => {
            //     console.log(e)
            //     toast.success("password updated");
            //     await api.auth.logout();
            //     router.invalidate();
            //   })
            //   .catch(() => {
            //     toast.error("password failedupdated");
            //   });
          }}
        >
          <input
            disabled
            name="password"
            className="input join-item"
            placeholder="New Password"
          />
          <button disabled type="submit" className="btn join-item">
            Update
          </button>
        </form>
      </div>
    </div>
  );
}

function Preferences({ user }: { user: SafeUser }) {
  const router = useRouter();
  return (
    <div className="tab-content p-2 space-y-6">
      {/* Hide dotfiles */}
      <div className="flex justify-between">
        <div>
          <h4 className="text-lg font-semibold">Hide dotfiles</h4>
          <p className="opacity-70 text-sm">
            Hide files and folder starting with period
          </p>
        </div>
        <input
          type="checkbox"
          className="toggle toggle-md toggle-success"
          onChange={async (e) => {
            await api.data.updateOne("users", user.id, {
              preferences: {
                ...user.preferences,
                hideDotfiles: e.target.checked,
              },
            });
          }}
          defaultChecked={user.preferences?.hideDotfiles}
        />
      </div>

      {/* Image Preview Generation */}
      <div className="flex justify-between">
        <div>
          <h4 className="text-lg font-semibold">
            Toggle Image Preview Generation
          </h4>
          <p className="opacity-70 text-sm">
            Whether to create preview for images on upload
          </p>
        </div>
        <input
          type="checkbox"
          className="toggle toggle-md toggle-success"
          onChange={async (e) => {
            await api.data.updateOne("users", user.id, {
              preferences: {
                ...user.preferences,
                generateImagePreviews: e.target.checked,
              },
            });
            router.invalidate();
          }}
          defaultChecked={user.preferences?.generateImagePreviews}
        />
      </div>

      {/* Video Preview Generation */}
      <div className="flex justify-between">
        <div>
          <h4 className="text-lg font-semibold">
            Toggle Video Preview Generation
          </h4>
          <p className="opacity-70 text-sm">
            Whether to create preview for videos on upload
          </p>
        </div>
        <input
          type="checkbox"
          className="toggle toggle-md toggle-success"
          onChange={async (e) => {
            await api.data.updateOne("users", user.id, {
              preferences: {
                ...user.preferences,
                generateVideoPreviews: e.target.checked,
              },
            });
            router.invalidate();
          }}
          defaultChecked={user.preferences?.generateVideoPreviews}
        />
      </div>
    </div>
  );
}

function Members({ user }: { user: SafeUser }) {
  const router = useRouter();
  return (
    <div className="tab-content p-2">
      <div className="flex justify-between">
        <div>
          <h4 className="text-lg font-semibold">Add Member</h4>
          {/* <p className="opacity-70 text-sm">Update password</p> */}
        </div>
        <form
          className="join"
          // onSubmit={async (e) => {
          //   e.preventDefault();
          //   const form = new FormData(e.currentTarget);

          //   const { data } = await api.data.createOne("users", {
          //     email: form.get("email") as string,
          //     strategy: "password",
          //     role: "MEMBER",
          //     strategy_value: await hash.sha256(form.get("password") as string),
          //   });

          //   console.log(data);
          // }}
        >
          <input
            disabled
            name="email"
            className="input join-item"
            placeholder="Email"
          />
          <input
            disabled
            name="password"
            className="input join-item"
            placeholder="Password"
          />
          <button disabled type="submit" className="btn join-item">
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
