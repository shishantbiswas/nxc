import { createFileRoute } from "@tanstack/react-router";
import { Admin } from "bknd/ui";
import "bknd/dist/styles.css";

export const Route = createFileRoute("/admin/$")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Admin
      withProvider
      config={{
        basepath: "/admin",
        logo_return_path: "/../",
      }}
    />
  );
}
