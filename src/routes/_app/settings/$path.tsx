import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { Settings } from "@/components/auth/settings/settings";
import { authClient } from "@/lib/auth-client";

const validSettingsPaths = [...Object.values(viewPaths.settings)];

export const Route = createFileRoute("/_app/settings/$path")({
  async beforeLoad({ params: { path }, location }) {
    if (!validSettingsPaths.includes(path)) {
      throw notFound();
    }

    const session = await authClient.getSession();

    if (!session) {
      throw redirect({
        to: "/auth/$path",
        params: { path: "sign-in" },
        search: { redirectTo: location.href },
      });
    }

    return { session };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { path } = Route.useParams();

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6">
      <Settings path={path} />
    </div>
  );
}
