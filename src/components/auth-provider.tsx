import { magicLinkPlugin } from "@better-auth-ui/core/plugins/magic-link";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { themePlugin } from "@/lib/auth/theme-plugin";
import { usernamePlugin } from "@/lib/auth/username-plugin";
import { authClient } from "@/lib/auth-client";
import { AuthProvider } from "./auth/auth-provider";
import { type Theme, useTheme } from "./theme-provider";
import { Toaster } from "./ui/sonner";

export function AuthUiProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  return (
    <AuthProvider
      authClient={authClient}
      redirectTo="/settings/account"
      emailAndPassword={{ requireEmailVerification: false }}
      navigate={navigate}
      plugins={[
        usernamePlugin({
          usernamePrefix: "@",
          localization: { usernamePlaceholder: "username" },
        }),
        themePlugin({
          theme,
          setTheme: (theme) => {
            setTheme(theme as Theme);
          },
        }),
        magicLinkPlugin(),
      ]}
      Link={({ href, ...props }) => <Link to={href} {...props} />}
    >
      {children}

      <Toaster />
    </AuthProvider>
  );
}
