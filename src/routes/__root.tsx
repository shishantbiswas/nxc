import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";
import { AuthUiProvider } from "@/components/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "../components/theme-provider";
import { ToastProvider } from "../components/toast-provider";
import type { trpc } from "../trpc";

export interface RouterAppContext {
  trpc: typeof trpc;
}

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider>
        <AuthUiProvider>
          <ToastProvider>
            <TooltipProvider>
              <Outlet />
            </TooltipProvider>
          </ToastProvider>
        </AuthUiProvider>
      </ThemeProvider>
    </>
  );
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Home",
      },
    ],
  }),
});
