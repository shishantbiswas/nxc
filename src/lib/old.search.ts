
// export async function createSearchTable(db: Kysely<DB>) {
//   const dialect = db.getExecutor().adapter.constructor.name;
//   const isPostgres = dialect.toLowerCase().includes("postgres");

//   if (isPostgres) {
//     // Requires CREATE EXTENSION IF NOT EXISTS vector;
//     await db.schema
//       .createTable("search")
//       .ifNotExists()
//       .addColumn("id", "text", (col) => col.primaryKey())
//       .addColumn("name", "text", (col) => col.notNull())
//       .addColumn("type", "text", (col) => col.notNull())
//       .addColumn("mime_type", "text")
//       .addColumn("metadata", sql`jsonb`)
//       .addColumn("embedding", sql`vector(384)`)
//       .execute();
//   } else {
//     // libSQL / SQLite native vector support
//     await db.schema
//       .createTable("search")
//       .ifNotExists()
//       .addColumn("id", "text", (col) => col.primaryKey())
//       .addColumn("name", "text", (col) => col.notNull())
//       .addColumn("type", "text", (col) => col.notNull())
//       .addColumn("mime_type", "text")
//       .addColumn("metadata", "text")
//       .addColumn("embedding", sql`F32_BLOB(384)`)
//       .execute();
//   }
// }

// export async function insertSearchItem(
//   db: Kysely<DB>,
//   item: {
//     id: string;
//     name: string;
//     type: string;
//     mime_type?: string;
//     metadata?: Record<string, any>;
//     embedding: number[];
//   },
// ) {
//   const dialect = db.getExecutor().adapter.constructor.name;
//   const isPostgres = dialect.toLowerCase().includes("postgres");
//   const metadataStr = item.metadata ? JSON.stringify(item.metadata) : null;
//   const embeddingJson = JSON.stringify(item.embedding);

//   if (isPostgres) {
//     await db
//       .insertInto("search")
//       .values({
//         id: item.id,
//         name: item.name,
//         type: item.type,
//         mime_type: item.mime_type || null,
//         metadata: item.metadata ? sql`${metadataStr}::jsonb` : null,
//         embedding: sql`${embeddingJson}::vector`,
//       })
//       .execute();
//   } else {
//     await db
//       .insertInto("search")
//       .values({
//         id: item.id,
//         name: item.name,
//         type: item.type,
//         mime_type: item.mime_type || null,
//         metadata: metadataStr,
//         embedding: sql`vector(${embeddingJson})`,
//       })
//       .execute();
//   }
// }

// export async function searchFiles(
//   db: Kysely<DB>,
//   searchQuery: string,
//   limit = 50,
// ) {
//   const dialect = db.getExecutor().adapter.constructor.name;
//   const isPostgres = dialect.toLowerCase().includes("postgres");
//   const embeddingModel = await pipeline(
//     "feature-extraction",
//     "Xenova/all-MiniLM-L6-v2",
//   );

//   const output = await embeddingModel(searchQuery, {
//     pooling: "mean",
//     normalize: true,
//   });
//   const embeddingJson = JSON.stringify(Array.from(output.data));

//   if (isPostgres) {
//     return await db
//       .selectFrom("search")
//       .selectAll()
//       .orderBy(sql`embedding <=> ${embeddingJson}::vector`, "asc")
//       .limit(limit)
//       .execute();
//   } else {
//     return await db
//       .selectFrom("search")
//       .selectAll()
//       .orderBy(
//         sql`vector_distance_cos(embedding, vector(${embeddingJson}))`,
//         "asc",
//       )
//       .limit(limit)
//       .execute();
//   }
// }

// async function createSearchTable(db: Kysely<DB>) {
//   const dialect = db.getExecutor().adapter.constructor.name;
//   const isPostgres = dialect.toLowerCase().includes("postgres");

//   if (isPostgres) {
//     await db.schema
//       .createTable("search")
//       .ifNotExists()
//       .addColumn("id", "text", (col) => col.primaryKey())
//       .addColumn("name", "text", (col) => col.notNull())
//       .addColumn("type", "text", (col) => col.notNull())
//       .addColumn("mime_type", "text")
//       .addColumn("metadata", sql`jsonb`)
//       .addColumn("search_vector", sql`tsvector`, (col) =>
//         col.generatedAlwaysAs(sql`to_tsvector('english', coalesce(name, ''))`),
//       )
//       .execute();

//     await db.schema
//       .createIndex("search_vector_idx")
//       .on("search")
//       .using("gin")
//       .column("search_vector")
//       .execute();
//   } else {
//     await db.schema
//       .createTable("search")
//       .ifNotExists()
//       .addColumn("id", "text", (col) => col.primaryKey())
//       .addColumn("name", "text", (col) => col.notNull())
//       .addColumn("type", "text", (col) => col.notNull())
//       .addColumn("mime_type", "text")
//       .addColumn("metadata", "text")
//       .execute();

//     await sql`
//       CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
//         id,
//         name,
//         type,
//         mime_type,
//         metadata
//       );
//     `.execute(db);
//   }
// }

// async function insertSearchItem(
//   db: Kysely<DB>,
//   item: {
//     id: string;
//     name: string;
//     type: string;
//     mime_type?: string;
//     metadata?: NodeFileMeta;
//   },
// ) {
//   const dialect = db.getExecutor().adapter.constructor.name;
//   const isPostgres = dialect.toLowerCase().includes("postgres");

//   const metadataStr = item.metadata ? JSON.stringify(item.metadata) : null;

//   if (isPostgres) {
//     await db
//       .insertInto("search")
//       .values({
//         id: item.id,
//         name: item.name,
//         type: item.type,
//         mime_type: item.mime_type || null,
//         metadata: item.metadata ? sql`${metadataStr}::jsonb` : null,
//       })
//       .execute();
//   } else {
//     await db.transaction().execute(async (trx) => {
//       await trx
//         .insertInto("search")
//         .values({
//           id: item.id,
//           name: item.name,
//           type: item.type,
//           mime_type: item.mime_type || null,
//           metadata: metadataStr,
//         })
//         .execute();

//       await sql`
//         INSERT INTO search_fts (id, name, type, mime_type, metadata)
//         VALUES (${item.id}, ${item.name}, ${item.type}, ${item.mime_type || null}, ${metadataStr})
//       `.execute(trx);
//     });
//   }
// }

// async function searchFiles(db: Kysely<DB>, searchTerm: string, limit = 50) {
//   const dialect = db.getExecutor().adapter.constructor.name;
//   const isPostgres = dialect.toLowerCase().includes("postgres");

//   if (isPostgres) {
//     return await db
//       .selectFrom("search")
//       .selectAll()
//       .where(
//         "search_vector",
//         "@@",
//         sql`plainto_tsquery('english', ${searchTerm})`,
//       )
//       .orderBy(
//         sql`ts_rank(search_vector, plainto_tsquery('english', ${searchTerm}))`,
//         "desc",
//       )
//       .limit(limit)
//       .execute();
//   } else {
//     const sanitizedTerm = searchTerm.replace(/["*.+-:]/g, " ").trim();
//     return await db
//       .selectFrom("search_fts")
//       .selectAll()
//       .where("search_fts", "match", `${sanitizedTerm}*`)
//       .limit(limit)
//       .execute();
//   }
// }
