import { createFileRoute } from "@tanstack/react-router";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/ariakit";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/ariakit/style.css";
import { useTheme } from "../../components/theme-provider";

export const Route = createFileRoute("/_app/editor")({
  component: RouteComponent,
});

function RouteComponent() {
  const editor = useCreateBlockNote();
  const {theme}  = useTheme();
  return <BlockNoteView editor={editor} theme={theme as any}/>;
}
