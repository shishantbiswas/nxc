import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("user")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("emailVerified", "integer", (col) => col.notNull())
    .addColumn("image", "text")
    .addColumn("username", "text")
    .addColumn("displayUsername", "text")
    .addColumn("quota", "integer")
    .addColumn("preferences", "text")
    .addColumn("managerId", "text", (col) =>
      col.references("user.id").onDelete("set null"),
    )
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("session")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("userId", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("expiresAt", "text", (col) => col.notNull())
    .addColumn("ipAddress", "text")
    .addColumn("userAgent", "text")
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("account")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("userId", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("accessToken", "text")
    .addColumn("accessTokenExpiresAt", "text")
    .addColumn("accountId", "text", (col) => col.notNull())
    .addColumn("refreshToken", "text")
    .addColumn("refreshTokenExpiresAt", "text")
    .addColumn("scope", "text")
    .addColumn("idToken", "text")
    .addColumn("password", "text")
    .addColumn("providerId", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("verification")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("value", "text", (col) => col.notNull())
    .addColumn("identifier", "text", (col) => col.notNull().unique())
    .addColumn("expiresAt", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("node")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.defaultTo("FILE").notNull())
    .addColumn("mimeType", "text")
    .addColumn("isFavourite", "integer", (col) => col.defaultTo(0))
    .addColumn("metadata", "text")
    .addColumn("deletedAt", "text")
    .addColumn("parentId", "text", (col) =>
      col.references("node.id").onDelete("set null"),
    )
    .addColumn("mediaId", "text", (col) =>
      col.references("media.id").onDelete("cascade"),
    )
    .addColumn("userId", "text", (col) =>
      col.references("user.id").onDelete("cascade"),
    )
    .execute();
  await db.schema
    .createIndex("idx_node_type")
    .on("node")
    .column("type")
    .execute();

  await db.schema
    .createIndex("idx_node_deleted_at")
    .on("node")
    .column("deletedAt")
    .execute();

  await db.schema
    .createIndex("idx_node_mime_type")
    .on("node")
    .column("mimeType")
    .execute();

  await db.schema
    .createTable("share")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("token", "text")
    .addColumn("validTill", "text")
    .addColumn("ownerId", "text", (col) =>
      col.references("user.id").onDelete("cascade"),
    )
    .addColumn("receiverId", "text", (col) =>
      col.references("user.id").onDelete("set null"),
    )
    .addColumn("nodeId", "text", (col) =>
      col.references("node.id").onDelete("cascade"),
    )
    .execute();

  await db.schema
    .createTable("media")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("path", "text")
    .addColumn("createdAt", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updatedAt", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db);
  await db.schema.dropTable("account").ifExists().execute();
  await db.schema.dropTable("verification").ifExists().execute();
  await db.schema.dropTable("session").ifExists().execute();
  await db.schema.dropTable("user").ifExists().execute();
  await db.schema.dropTable("node").ifExists().execute();
  await db.schema.dropTable("share").ifExists().execute();
  await db.schema.dropTable("media").ifExists().execute();
  await db.schema.dropIndex("idx_node_mime_type").ifExists().execute();
  await db.schema.dropIndex("idx_node_deleted_at").ifExists().execute();
  await db.schema.dropIndex("idx_node_type").ifExists().execute();
  await sql`PRAGMA foreign_keys = ON`.execute(db);
}
