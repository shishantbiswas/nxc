import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";
import { ClientProvider } from "bknd/client";
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
      <ClientProvider>
        <ThemeProvider>
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </ThemeProvider>
      </ClientProvider>
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
