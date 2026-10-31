import { createClient } from "@libsql/client";
import type { Users } from "bknd";
import {
  boolean,
  type DB,
  datetime,
  type EntityConfig,
  em,
  entity,
  enumm,
  json,
  libsql,
  number,
  systemEntity,
  text,
} from "bknd";
import type { FrameworkBkndConfig } from "bknd/adapter";
import { nodeSqlite, registerLocalMediaAdapter } from "bknd/adapter/node";
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
    nodes: entity(
      "nodes",
      {
        name: text().required(),
        type: enumm({
          enum: ["FOLDER", "FILE"],
          default_value: "FILE",
        }).required(),

        mime_type: text(),
        is_favourite: boolean(),
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

    // // SHARED RELATIONS
    relation(shared).manyToOne(users, { ...CASCADE, mappedBy: "owner" });
    relation(shared).manyToOne(users, { mappedBy: "receiver" });
    relation(shared).manyToOne(nodes, CASCADE);
  },
);
const isDev = process.env.NODE_ENV !== "production";

export default {
  connection: isDev
    ? nodeSqlite({
        url: "file:dev.db",
        onCreateConnection: (db) => {
          db.exec("PRAGMA journal_mode = WAL;");
        },
      })
    : getDB(),

  options: {
    seed: async (ctx) => {
      const user = await ctx.app.module.auth.createUser({
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

      if (process.env.ENABLE_DEMO) {
        const api = ctx.app.getApi();
        await addDemoContent(api, user).catch(console.error);
      }
    },
    plugins: [
      timestamps({
        entities: ["nodes"],
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
      await deleteNodes(api, body.id, body.type).catch(console.error);
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
            "system.access.api",
            "data.entity.create",
            "data.entity.delete",
            "data.entity.read",
            "data.entity.update",
            "media.file.read",
            "media.file.upload",
            "media.file.delete",
          ],
        },
      },
      allow_register: false,
      jwt: { secret: process.env.JWT_SECRET },
      default_role_register: "MEMBER",
      strategies: {
        password: {
          type: "password",
          config: {
            hashing: "bcrypt",
          },
        },
      },
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
        if (node.media?.path) {
          await api.media.deleteFile(node.media.path).catch(console.error);
        }

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

async function addDemoContent(api: Api, user: Users) {
  await api.data.createOne("nodes", {
    type: "FOLDER",
    name: "Spicy Video",
    parent_id: undefined,
    users_id: user.id as string,
    created_at: new Date(),
  });
  const { data: pictureFolder } = await api.data.createOne("nodes", {
    type: "FOLDER",
    name: "Cool Pictures",
    parent_id: undefined,
    users_id: user.id as string,
    created_at: new Date(),
  });
  await api.data.createOne("nodes", {
    type: "FOLDER",
    name: "My Jam",
    parent_id: undefined,
    users_id: user.id as string,
    created_at: new Date(),
  });
  const { data: bridge } = (await api.media
    .upload(
      "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?ixlib=rb-4.1.0",
      {
        filename: "bridge.jpg",
      },
    )
    .catch()) as any;
  const { data: women } = (await api.media
    .upload(
      "https://images.unsplash.com/photo-1772989665252-7cb41ae759cc?fm=jpg",
      {
        filename: "girl.jpg",
      },
    )
    .catch()) as any;
  const { data: mr_moral } = (await api.media
    .upload("https://i.ytimg.com/vi/uAPUkgeiFVY/maxresdefault.jpg", {
      filename: "mr_moral.jpg",
    })
    .catch()) as any;
  const { data: lucy } = (await api.media
    .upload(
      "https://preview.redd.it/i-just-finished-cyberpunk-edgerunners-and-im-now-broken-ask-v0-gw5vhgaqocac1.jpeg",
      {
        filename: "lucy.jpeg",
      },
    )
    .catch()) as any;

  // https://i.redd.it/htyfnnm5zdih1.jpg

  await api.data.createOne("nodes", {
    type: "FILE",
    name: "bridge.jpg",
    media_id: bridge.id,
    mime_type: "image/jpg",
    metadata: {
      size: bridge.size,
    },
    parent_id: pictureFolder.id,
    users_id: user.id as string,
    created_at: new Date(),
  });
  await api.data.createOne("nodes", {
    type: "FILE",
    name: "non existent gf.jpg",
    media_id: women.id,
    mime_type: "image/jpg",
    metadata: {
      size: women.size,
    },
    parent_id: pictureFolder.id,
    users_id: user.id as string,
    created_at: new Date(),
  });
  await api.data.createOne("nodes", {
    type: "FILE",
    name: "mr_moral.jpg",
    media_id: mr_moral.id,
    mime_type: "image/jpg",
    metadata: {
      size: mr_moral.size,
    },
    parent_id: pictureFolder.id,
    users_id: user.id as string,
    created_at: new Date(),
  });
  await api.data.createOne("nodes", {
    type: "FILE",
    name: "lucy.jpeg",
    media_id: lucy.id,
    mime_type: "image/jpeg",
    metadata: {
      size: lucy.size,
    },
    parent_id: pictureFolder.id,
    users_id: user.id as string,
    created_at: new Date(),
  });
}
