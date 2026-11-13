import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { routeTree } from "./routeTree.gen";
import { trpc } from "./trpc";

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreload: "intent",
  trailingSlash: "never",
  context: {
    trpc,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
