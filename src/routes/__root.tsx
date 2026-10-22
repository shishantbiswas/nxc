import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ClientProvider } from "bknd/client";
import { ThemeProvider } from "../components/theme-provider";
import { ToastProvider } from "../components/toast-provider";

const RootLayout = () => (
  <ClientProvider>
    <ThemeProvider>
      <ToastProvider>
        <title>Home</title>
        <Outlet />
      </ToastProvider>
    </ThemeProvider>
  </ClientProvider>
);

export const Route = createRootRoute({ component: RootLayout });
