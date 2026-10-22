import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  boolean,
  type DB,
  datetime,
  type EntityConfig,
  em,
  entity,
  enumm,
  json,
  number,
  systemEntity,
  text,
} from "bknd";
import type { FrameworkBkndConfig } from "bknd/adapter";
import { registerLocalMediaAdapter } from "bknd/adapter/bun";
import type { Api } from "bknd/client";
import { timestamps } from "bknd/plugins";
import { streamSSE } from "hono/streaming";
import { type Kysely, sql } from "kysely";
import { nanoid } from "nanoid";
import type { NodeFileMeta, UserPreferences } from "./bknd-types";
import { getDB, getStorage } from "./src/config-creator";
import { getMimeTypeByExtension } from "./src/utils/mime";
import { getImageThumbnail } from "./src/utils/server/get-image-thumbnail";
import { captureFrameFromTimestampFromLocalFile } from "./src/utils/server/get-video-frame";
import {
  getImageDimensions,
  getVideoDimensionsFromLocalFile,
} from "./src/utils/server/metadata";

const adapter = registerLocalMediaAdapter();

const FIELD_CONFIG: EntityConfig = { primary_format: "uuid" };
const CASCADE = {
  fieldConfig: {
    label: "",
    on_delete: "cascade",
  },
};

const schema = em(
  {
    nodes: entity(
      "nodes",
      {
        name: text().required(),
        type: enumm({
          enum: ["FOLDER", "FILE"],
          default_value: "FILE",
        }).required(),

        mime_type: text(),
        isFavourite: boolean(),
        metadata: json<NodeFileMeta>(),
        deleted_at: datetime(),
      },
      FIELD_CONFIG,
    ),
    shared: entity(
      "shared",
      {
        token: text(),
        valid_till: datetime(),
      },
      FIELD_CONFIG,
    ),
    users: systemEntity(
      "users",
      {
        name: text(),
        quota: number(),
        preferences: json({
          default_value: {
            hideDotfiles: false,
            wallpaper: "/wallpaper/1.jpg",
            generateImagePreviews: false,
            generateVideoPreviews: false,
          } as UserPreferences,
        }),
      },
      FIELD_CONFIG,
    ),
    media: systemEntity("media", {}, FIELD_CONFIG),
  },
  ({ index, relation }, { nodes, media, users, shared }) => {
    index(nodes).on(["type"]);
    index(nodes).on(["deleted_at"]);
    index(nodes).on(["mime_type"]);

    // NODE RELATIONS
    relation(nodes).manyToOne(nodes, { mappedBy: "parent" });
    relation(nodes).manyToOne(media, CASCADE);
    relation(nodes).manyToOne(users, CASCADE);

    // SHARED RELATIONS
    relation(shared).manyToOne(users, { ...CASCADE, mappedBy: "owner" });
    relation(shared).manyToOne(users, { mappedBy: "receiver" });
    relation(shared).manyToOne(nodes, CASCADE);
  },
);
const isDev = process.env.NODE_ENV !== "production";

export default {
  connection: isDev
    ? {
        url: "data.db",
      }
    : getDB(),

  options: {
    seed: async (ctx) => {
      await ctx.app.module.auth.createUser({
        email: process.env.EMAIL as string,
        password: process.env.PASSWORD as string,
        name: "Shishant Biswas",
        role: "ADMIN",
      });
    },
    plugins: [
      timestamps({
        entities: ["nodes", "shared"],
      }),
    ],
  },
  onBuilt: async (app) => {
    const server = app.server;
    const db = app.connection.kysely;

    server.post("/api/media/upload-by-url", async (c) => {
      const headers = c.req.raw.headers;
      const body = await c.req.json<{
        id?: string;
        url?: string;
        name?: string;
        folderId?: string;
      }>();
      if (!body?.url || !body?.name || !body?.id) {
        return c.json(
          { error: true, message: "('url'|'id'|'name') is not provided" },
          400, // BAD_REQUEST,
        );
      }

      const api = app.getApi({ headers });
      await api.verifyAuth();
      const { user } = await api.auth.me();

      const verifiedUser = api.isAuthVerified() && api.isAuthenticated();

      if (!verifiedUser || !user) {
        return c.json(
          { error: true, message: "unauthorized access" },
          401, // UNAUTHORIZED,
        );
      }

      const response = await fetch(body.url, { redirect: "follow" });
      if (!response.body) {
        return c.json({ error: true, message: "body is empty" });
      }
      const contentLength = response.headers.get("content-length");
      const contentType =
        response.headers.get("content-type") ?? "application/octet-stream";

      const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
      const name = body.name;

      const tempFilePath = path.join(tmpdir(), `${nanoid()}_${body.name}`);
      const fileWriteStream = createWriteStream(tempFilePath);

      return streamSSE(c as any, async (stream) => {
        let receivedBytes = 0;
        try {
          const reader = response.body!.getReader();

          const writePromise = (async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                fileWriteStream.end();
                break;
              }

              fileWriteStream.write(value);
              receivedBytes += value.length;

              const percentage = totalBytes
                ? Math.round((receivedBytes / totalBytes) * 100)
                : null;

              await stream.writeSSE({
                data: JSON.stringify({ percentage, receivedBytes, totalBytes }),
                event: "upload-update",
              });
            }
          })();

          await writePromise;

          const fileBuffer = await readFile(tempFilePath);

          const file = new File([fileBuffer], body.name as string, {
            type: contentType,
          });
          const size = Number(contentLength ?? file.size);

          const ext =
            name.lastIndexOf(".") !== -1
              ? name.slice(name.lastIndexOf("."))
              : "";

          const { data } = await api.media.upload(file, {
            filename: body.id + ext,
          }); // create media

          const mime = getMimeTypeByExtension(name) ?? contentType;
          const meta: any = {};
          if (mime?.startsWith("video/")) {
            meta.fileType = "video";
            const video = await getVideoDimensionsFromLocalFile(tempFilePath);
            meta.width = video.width;
            meta.height = video.height;
            meta.duration = video.duration;
            if (user.preferences?.generateVideoPreviews) {
              const thumbnail = await captureFrameFromTimestampFromLocalFile(
                tempFilePath,
                name,
                20,
              ).catch(console.error); // ignore error for thumbnail
              if (thumbnail) {
                const filename = `preview_${nanoid()}.jpg`;
                await api.media
                  .upload(thumbnail, {
                    filename,
                  })
                  .catch(console.error); // ignore error for thumbnail
                meta.preview = filename;
              }
            }
          }

          if (mime?.startsWith("image/")) {
            meta.fileType = "image";
            const image = await getImageDimensions(file);
            meta.width = image.width;
            meta.height = image.height;
            if (
              user.preferences?.generateImagePreviews &&
              (Number(contentLength) || size) > 1024 * 1024 * 5
            ) {
              const thumbnail = await getImageThumbnail(file, name).catch(
                console.error,
              );
              if (thumbnail) {
                const filename = `preview_${nanoid()}${ext}`;
                await api.media.upload(thumbnail, {
                  filename,
                });
                meta.preview = filename;
              }
            }
          }

          await api.data.createOne("nodes", {
            name: decodeURIComponent(name),
            type: "FILE",
            users_id: user.id as string,
            media_id: (data as unknown as DB["media"]).id as string,
            parent_id: body.folderId ?? undefined,
            mime_type: mime || "application/octet-stream",
            metadata: {
              size,
              ...(meta.fileType ? meta : undefined),
            },
          });
        } catch (error) {
          console.error("Error processing file stream:", error);
        } finally {
          // Clean up temp file from filesystem
          await unlink(tempFilePath).catch(() => {});
        }
      });
    });

    server.get("/api/data/breadcrumbs", async (c) => {
      const folderId = c.req.query("folderId");
      if (!folderId) return c.json({ message: "'folderId' is required" });
      const data = await getBreadcrumbs(db, folderId);
      return c.json({ data });
    });

    server.get("/api/storage-usage", async (c) => {
      const headers = c.req.raw.headers;

      const api = app.getApi({ headers });
      await api.verifyAuth();
      const { user } = await api.auth.me();

      const verifiedUser = api.isAuthVerified() && api.isAuthenticated();

      if (!verifiedUser || !user) {
        return c.json(
          { error: true, message: "unauthorized access" },
          401, // UNAUTHORIZED,
        );
      }
      return c.json({ size: await getStoaredDataSize(db, String(user.id)) });
    });

    server.post("/api/delete", async (c) => {
      const headers = c.req.raw.headers;

      const api = app.getApi({ headers });
      await api.verifyAuth();
      const { user } = await api.auth.me();

      const verifiedUser = api.isAuthVerified() && api.isAuthenticated();

      if (!verifiedUser || !user) {
        return c.json(
          { error: true, message: "unauthorized access" },
          401, // UNAUTHORIZED,
        );
      }
      const body = await c.req.json<{
        id?: string;
        type?: "FILE" | "FOLDER";
      }>();

      if (!body.id || !body.type) {
        return c.json({ error: true, message: "('id'|'type') is required" });
      }
      console.log(body.id);
      await deleteNodes(api, body.id, body.type);
      return c.json({
        sucess: true,
        message: "files/folder deleted successfully",
      });
    });

    server.post("/api/convert", async (c) => {
      const headers = c.req.raw.headers;

      const api = app.getApi({ headers });
      await api.verifyAuth();
      const { user } = await api.auth.me();

      const verifiedUser = api.isAuthVerified() && api.isAuthenticated();

      if (!verifiedUser || !user) {
        return c.json(
          { error: true, message: "unauthorized access" },
          401, // UNAUTHORIZED,
        );
      }
      const body = await c.req.json<{
        id?: string;
        resolution?: string;
      }>();

      if (!body.id || !body.resolution) {
        return c.json({
          error: true,
          message: "('id'|'resolution') is required",
        });
      }

      const { data: node } = await api.data.readOne("nodes", body.id, {
        with: ["media"],
      });
      if (!node) return c.json({ error: true, message: "file not found" }, 404);

      if (
        node.type !== "FILE" ||
        !node.media_id ||
        node.metadata.fileType !== "video"
      ) {
        console.log({ node, id: body.id });
        return c.json(
          { error: true, message: "only video files are convertible" },
          422, // Unprocessable Entity,
        );
      }
      const ext =
        node.name.lastIndexOf(".") !== -1
          ? node.name.slice(node.name.lastIndexOf("."))
          : "";
      const resolutionWithoutP = body.resolution.endsWith("p")
        ? body.resolution.slice(0, body.resolution.length - 1)
        : body.resolution;

      const tempFilePath = path.join(tmpdir(), `${nanoid()}${ext}`);
      const tempFileOutputPath = path.join(
        tmpdir(),
        `${body.resolution}_${nanoid()}${ext}`,
      );

      try {
        const file = await api.media.download(node.media!.path);
        const buffer = await file.arrayBuffer();

        await writeFile(tempFilePath, Buffer.from(buffer));
        await convertVideo(
          tempFilePath,
          tempFileOutputPath,
          resolutionWithoutP,
        );

        const convertedBuffer = await readFile(tempFileOutputPath);

        const convertedFile = new File([convertedBuffer], body.id + ext, {
          type: node.mime_type,
        });

        const { data } = await api.media.upload(convertedFile, {
          filename: `${nanoid()}${ext}`,
        });
        const stats = await stat(tempFileOutputPath);

        const meta: any = {};
        meta.fileType = "video";
        const video = await getVideoDimensionsFromLocalFile(tempFileOutputPath);
        meta.width = video.width;
        meta.height = video.height;
        meta.duration = video.duration;
        if (user.preferences?.generateVideoPreviews) {
          const thumbnail = await captureFrameFromTimestampFromLocalFile(
            tempFileOutputPath,
            node.name,
            20,
          ).catch(console.error); // ignore error for thumbnail
          if (thumbnail) {
            const filename = `preview_${nanoid()}.jpg`;
            await api.media
              .upload(thumbnail, {
                filename,
              })
              .catch(console.error); // ignore error for thumbnail
            meta.preview = filename;
          }
        }

        await api.data.createOne("nodes", {
          name: `${body.resolution}_${node.name}`,
          type: "FILE",
          users_id: user.id as string,
          media_id: (data as unknown as DB["media"]).id as string,
          parent_id: node.parent_id ?? undefined,
          mime_type: node.mime_type,
          metadata: {
            size: stats.size,
            ...(meta.fileType ? meta : undefined),
          },
        });
      } catch (error) {
        console.error(error);
        return c.json({
          error: true,
          message:
            error instanceof Error ? error.message : "video convertion failed",
        });
      } finally {
        await unlink(tempFilePath);
        await unlink(tempFileOutputPath);
      }

      return c.json({
        sucess: true,
        message: "video converted",
      });
    });
  },
  config: {
    data: schema.toJSON(),
    auth: {
      enabled: true,
      guard: {
        enabled: process.env.ENABLE_GUARD
          ? Boolean(process.env.ENABLE_GUARD)
          : process.env.NODE_ENV === "production",
      },
      roles: {
        ADMIN: {
          implicit_allow: true,
          is_default: false,
        },
        ANONYMOUS: {
          is_default: true,
          implicit_allow: false,
        },
      },
      allow_register: false,
      jwt: { secret: process.env.JWT_SECRET },
    },
    media: {
      enabled: true,
      storage: {
        body_max_size: Number(process.env.MAX_BODY_SIZE || 1024 * 1024 * 1024),
      },
      adapter: isDev
        ? adapter({
            path: "./uploads",
          })
        : getStorage(),
    },
  },
} satisfies FrameworkBkndConfig;

async function deleteNodes(api: Api, id: string, type: "FILE" | "FOLDER") {
  try {
    const { data } = await api.data.readMany("nodes", {
      with: ["media"],
      where: {
        ...(type === "FOLDER" ? { parent_id: id } : {}),
        ...(type === "FILE" ? { id } : {}),
      },
    });

    for (const node of data) {
      if (node.type === "FOLDER") {
        await deleteNodes(api, node.id, type);
      } else {
        if (node.metadata && "preview" in node.metadata) {
          await api.media
            .deleteFile(node.metadata.preview as string)
            .catch(console.error);
        }

        await api.media.deleteFile(node.media!.path).catch(console.error);

        await api.data.deleteOne("nodes", node.id);
      }
    }

    // Finally, delete the parent folder itself after all contents are gone
    await api.data.deleteOne("nodes", id);
  } catch (error) {
    console.error(`Failed to delete node ${id}:`, error);
  }
}

function sumJsonField(columnName: string, jsonPath: string) {
  return (db: Kysely<DB>) => {
    const dialect = db.getExecutor().adapter.constructor.name;
    const parts = jsonPath.split(".");

    if (dialect.toLowerCase().includes("postgres")) {
      let pathSql = columnName;
      for (let i = 0; i < parts.length; i++) {
        const isLast = i === parts.length - 1;
        pathSql += `${isLast ? "->>" : "->"}'${parts[i]}'`;
      }
      return sql<number>`coalesce(sum((${sql.raw(pathSql)})::numeric), 0)`;
    }

    // MySQL / SQLite
    const formattedPath = `$.${parts.join(".")}`;
    return sql<number>`coalesce(sum(json_extract(${sql.ref(columnName)}, ${sql.val(formattedPath)})), 0)`;
  };
}

async function getBreadcrumbs(db: Kysely<DB>, currentFolderId: string) {
  const result = await db
    .withRecursive("breadcrumbs", (cte) =>
      cte
        // 1. Anchor Query: Start at the target folder
        .selectFrom("nodes")
        .select(["id", "name", "parent_id", sql<number>`0`.as("depth")])
        .where("id", "=", currentFolderId)

        // 2. Recursive Query: Walk up parent links
        .unionAll((eb) =>
          eb
            .selectFrom("nodes as n")
            .innerJoin("breadcrumbs as b", "n.id", "b.parent_id")
            .select([
              "n.id",
              "n.name",
              "n.parent_id",
              sql<number>`b.depth + 1`.as("depth"),
            ]),
        ),
    )
    // 3. Final Query: Order from Root -> Current Folder
    .selectFrom("breadcrumbs")
    .select(["id", "name"])
    .orderBy("depth", "desc")
    .execute();

  return result;
}

async function getStoaredDataSize(db: Kysely<DB>, userId: string) {
  const result = await db
    .selectFrom("nodes")
    .where("type", "=", "FILE")
    .where("users_id", "=", userId)
    .select(() => [sumJsonField("metadata", "size")(db).as("total_size")])
    .executeTakeFirst();
  return result;
}

async function convertVideo(
  inputPath: string,
  outputPath: string,
  resolution: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args: string[] = [
      "-i",
      inputPath,
      "-vf",
      `scale=-2:${resolution}`,
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stdin.end();

    ffmpeg.stdout.on("data", (data: Buffer) => {
      console.log(`stdout: ${data}`);
    });

    ffmpeg.stderr.on("data", (data: Buffer) => {
      console.error(`stderr: ${data}`);
    });

    ffmpeg.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    ffmpeg.on("error", (err: Error) => {
      reject(err);
    });
  });
}
