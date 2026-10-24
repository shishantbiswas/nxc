import type { DB } from "bknd";
import { type Kysely, sql } from "kysely";
import type { NodeFileMeta } from "../../bknd-types";

export async function createSearchTable(db: Kysely<DB>) {
  await db.schema
    .createTable("search")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("mime_type", "text")
    .addColumn("metadata", "text")
    .execute();

  await sql`
      CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
        id,
        content,
        type,
        mime_type,
        metadata
      );
    `.execute(db);
}

export async function insertSearchItem(
  db: Kysely<DB>,
  item: {
    id: string;
    content: string;
    type: string;
    mime_type?: string;
    metadata?: NodeFileMeta;
  },
) {
  const metadataStr = item.metadata ? JSON.stringify(item.metadata) : null;

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("search")
      .values({
        id: item.id,
        content: item.content,
        type: item.type,
        mime_type: item.mime_type || null,
        metadata: metadataStr,
      })
      .execute();

    await sql`
        INSERT INTO search_fts (id, content, type, mime_type, metadata)
        VALUES (${item.id}, ${item.content}, ${item.type}, ${item.mime_type || null}, ${metadataStr})
      `.execute(trx);
  });
}

export async function deleteSearchItem(db: Kysely<DB>, id: string) {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("search").where("id", "=", id).execute();

    await sql`
        DELETE FROM search_fts
        WHERE id = ${id};
      `.execute(trx);
  });
}

export async function updateSearchItem(
  db: Kysely<DB>,
  id: string,
  item: {
    id: string;
    content: string;
    type: string;
    mime_type?: string;
    metadata?: NodeFileMeta;
  },
) {
  const metadataStr = item.metadata ? JSON.stringify(item.metadata) : null;

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("search")
      .set({
        ...item,
        metadata: metadataStr,
      })
      .where("id", "=", id)
      .execute();

    await sql`
        UPDATE search_fts
        SET id = ${item.id},
            type = ${item.type},
            content = ${item.content ?? null},
            mime_type = ${item.mime_type || null},
            metadata = ${metadataStr}
        WHERE id = ${id};
      `.execute(trx);
  });
}

export async function searchFiles(
  db: Kysely<DB>,
  searchTerm: string,
  limit = 50,
) {
  const sanitizedTerm = searchTerm.replace(/["*.+-:]/g, " ").trim();
  return await db
    .selectFrom("search_fts")
    .selectAll()
    .where("search_fts", "match", `${sanitizedTerm}*`)
    .limit(limit)
    .execute();
}
