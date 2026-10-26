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
import { registerLocalMediaAdapter } from "bknd/adapter/node";
import type { Api } from "bknd/client";
import { timestamps } from "bknd/plugins";
import { type Kysely, sql } from "kysely";
import type { NodeFileMeta, UserPreferences } from "./bknd-types";
import { getDB, getStorage } from "./src/config-creator";
import { convertVideoPlugin } from "./src/plugins/bknd/convert-video";
import { searchPlugin } from "./src/plugins/bknd/search";
import { uploadViaUrlPlugin } from "./src/plugins/bknd/upload-via-url";

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
            hideDotfiles: true,
            wallpaper: `/wallpaper/${Math.floor(Math.random() * 6) + 1}.jpg`,
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

    // USER RELATIONS
    relation(users).manyToOne(users, { mappedBy: "manager" });

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
        url: "file:dev.db",
      }
    : getDB(),

  options: {
    seed: async (ctx) => {
      await ctx.app.module.auth.createUser({
        name: process.env.USER_NAME as string,
        email: process.env.USER_EMAIL as string,
        password: process.env.USER_PASSWORD as string,
        role: "ADMIN",
        preferences: {
          hideDotfiles: true,
          wallpaper: `/wallpaper/${Math.floor(Math.random() * 6) + 1}.jpg`,
          generateImagePreviews: process.env.GENERATE_IMAGE_PREVIEWS ?? false,
          generateVideoPreviews: process.env.GENERATE_VIDEO_PREVIEWS ?? false,
        } as UserPreferences,
      });
    },
    plugins: [
      timestamps({
        entities: ["nodes", "shared"],
      }),
      searchPlugin,
      convertVideoPlugin,
      uploadViaUrlPlugin,
    ],
  },
  onBuilt: async (app) => {
    const db = app.connection.kysely;

    app.server.get("/api/data/breadcrumbs", async (c) => {
      const folderId = c.req.query("folderId");
      if (!folderId) return c.json({ message: "'folderId' is required" });
      const data = await getBreadcrumbs(db, folderId);
      return c.json({ data });
    });

    app.server.get("/api/storage-usage", async (c) => {
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

    app.server.post("/api/delete", async (c) => {
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
        MEMBER: {
          permissions: [
            {
              permission: "system.access.api",
              effect: "allow",
            },
            {
              permission: "data.entity.create",
              effect: "allow",
            },
            {
              permission: "data.entity.delete",
              effect: "allow",
            },
            {
              permission: "data.entity.read",
              effect: "allow",
            },
            {
              permission: "data.entity.update",
              effect: "allow",
            },
            {
              permission: "media.file.read",
              effect: "allow",
            },
            {
              permission: "media.file.upload",
              effect: "allow",
            },
            {
              permission: "media.file.delete",
              effect: "allow",
            },
          ],
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
