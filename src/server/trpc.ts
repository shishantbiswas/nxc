import { initTRPC } from "@trpc/server";
import * as z from "zod";

const t = initTRPC.create();

const publicProcedure = t.procedure;
const router = t.router;

export const appRouter = router({
  hello: publicProcedure.input(z.string().nullish()).query(({ input }) => {
    return `Hello ${input ?? "World"}!`;
  }),
  data: {},
  media: {},
});

export type AppRouter = typeof appRouter;
