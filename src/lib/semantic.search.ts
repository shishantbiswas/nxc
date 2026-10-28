// not functional because of sqlite error 
// TypeError: First argument must be an Error object
// at new SqliteError (/Users/bsws/code/nxc/node_modules/libsql/sqlite-error.js:14:15)
// at convertError (/Users/bsws/code/nxc/node_modules/libsql/index.js:59:12)
// at run (/Users/bsws/code/nxc/node_modules/libsql/index.js:335:13)
// at executeStmt (/Users/bsws/code/nxc/node_modules/@libsql/client/lib-esm/sqlite3.js:549:34)
// at execute (/Users/bsws/code/nxc/node_modules/@libsql/client/lib-esm/sqlite3.js:245:20)
// at async <anonymous> (/Users/bsws/code/nxc/node_modules/bknd/dist/index.js:84:2633)
// at async <anonymous> (/Users/bsws/code/nxc/node_modules/bknd/dist/index.js:84:2823)
// at async <anonymous> (/Users/bsws/code/nxc/node_modules/bknd/dist/index.js:54:39302)
// at async executeQuery (/Users/bsws/code/nxc/node_modules/bknd/dist/index.js:54:39932)
// at async rollbackTransaction (/Users/bsws/code/nxc/node_modules/bknd/dist/index.js:54:39170)
// at async <anonymous> (/Users/bsws/code/nxc/node_modules/kysely/dist/esm/kysely.js:577:46)
// at async provideConnection (/Users/bsws/code/nxc/node_modules/kysely/dist/esm/driver/default-connection-provider.js:10:26)

// import { pipeline } from "@huggingface/transformers";
// import type { DB } from "bknd";
// import { type Kysely, sql } from "kysely";
// import type { NodeFileMeta } from "../../bknd-types";

// let extractorPromise: Promise<any> | null = null;
// async function getExtractor() {
//   if (!extractorPromise) {
//     extractorPromise = pipeline(
//       "feature-extraction",
//       "Xenova/all-MiniLM-L6-v2",
//     );
//   }
//   return extractorPromise;
// }

// export async function createSearchTable(db: Kysely<DB>) {
//   await db.schema
//     .createTable("search")
//     .ifNotExists()
//     .addColumn("id", "text", (col) =>
//       col.primaryKey().defaultTo(sql`(gen_random_uuid())`),
//     )
//     .addColumn("content", "text", (col) => col.notNull())
//     .addColumn("type", "text", (col) => col.notNull())
//     .addColumn("mime_type", "text")
//     .addColumn("metadata", "text")
//     .addColumn("embedding", sql`f32_blob(384)`)
//     .execute();

//   await sql`
//       CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
//         id,
//         content,
//         type,
//         mime_type,
//         metadata
//       );
//     `.execute(db);

//   await sql`
//       CREATE INDEX IF NOT EXISTS search_embedding_idx ON search(libsql_vector_idx(embedding));
//     `.execute(db);
// }

// export async function insertSearchItem(
//   db: Kysely<DB>,
//   item: {
//     id?: string;
//     content: string;
//     type: string;
//     mime_type?: string;
//     metadata?: NodeFileMeta;
//     embedding: number[];
//   },
// ) {
//   const metadataStr = item.metadata ? JSON.stringify(item.metadata) : null;
//   const vectorLiteral = `[${item.embedding.join(",")}]`;

//   await db.transaction().execute(async (trx) => {
//     const insertQuery = trx.insertInto("search").values({
//       ...(item.id ? { id: item.id } : {}),
//       content: item.content,
//       type: item.type,
//       mime_type: item.mime_type || null,
//       metadata: metadataStr,
//       embedding: sql`vector32(${vectorLiteral})`,
//     });

//     const result = await insertQuery.returning("id").executeTakeFirstOrThrow();
//     const insertedId = result.id;

//     await sql`
//         INSERT INTO search_fts (id, content, type, mime_type, metadata)
//         VALUES (${insertedId}, ${item.content}, ${item.type}, ${item.mime_type || null}, ${metadataStr})
//       `.execute(trx);
//   });
// }

// export async function searchFiles(
//   db: Kysely<DB>,
//   searchTerm: string,
//   limit = 50,
// ) {
//   if (searchTerm && searchTerm.trim() !== "") {
//     const extractor = await getExtractor();
//     const output = await extractor(searchTerm, {
//       pooling: "mean",
//       normalize: true,
//     });
//     const queryEmbedding = Array.from(output.data);
//     const vectorLiteral = `[${queryEmbedding.join(",")}]`;

//     return await sql`
//       SELECT search.id, search.content, search.type, search.mime_type, search.metadata,
//              vector_distance_cos(search.embedding, vector32(${vectorLiteral})) AS distance
//       FROM vector_top_k('search_embedding_idx', vector32(${vectorLiteral}), ${limit})
//       JOIN search ON search.rowid = id
//     `.execute(db);
//   }

//   const sanitizedTerm = searchTerm.replace(/["*.+-:]/g, " ").trim();
//   return await db
//     .selectFrom("search_fts")
//     .selectAll()
//     .where("search_fts", "match", `${sanitizedTerm}*`)
//     .limit(limit)
//     .execute();
// }
