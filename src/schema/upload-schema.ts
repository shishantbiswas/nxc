import { z } from "zod";

export const uploadSchema = z.discriminatedUnion("create", [
  z.object({
    create: z.literal("FILE"),
    data: z.discriminatedUnion("isUrl", [
      z.object({
        isUrl: z.literal(false),
        files: z.array(
          z.object({
            id: z.nanoid(),
            fileData: z.instanceof(File),
          }),
        ),
      }),
      z.object({ isUrl: z.literal(true), url: z.url() }),
    ]),
  }),
  z.object({
    create: z.literal("FOLDER"),
    data: z.discriminatedUnion("withFiles", [
      z.object({
        withFiles: z.literal(true),
        files: z.array(
          z.object({
            id: z.nanoid(),
            fileData: z.instanceof(File),
          }),
        ),
      }),
      z.object({ withFiles: z.literal(false), folderName: z.string().min(3, "Please enter a valid name") }),
    ]),
  }),
]);

export type UploadSchema = z.infer<typeof uploadSchema>;
