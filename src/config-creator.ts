import { createClient } from "@libsql/client";
import { libsql, pg } from "bknd";
import { bunSqlite, registerLocalMediaAdapter } from "bknd/adapter/bun";
import { Pool } from "pg";
import { z } from "zod";

const schema = z.object({
  db: z.enum([
    "libsql-remote",
    "postgres",
    "sqlite",
    "libsql",
    "libsql-remote-embedded-replicas",
  ]),
  storage: z.enum(["S3", "local"]),
  defaultUser: z.string().optional(),
  defaultUserName: z.string().optional(),
  defaultPassword: z.string().optional(),
});

export type Config = z.infer<typeof schema>;

const parsedConfig = schema.safeParse({
  db: process.env.DB_TYPE ?? "libsql",
  storage: process.env.STORAGE_TYPE ?? "local",
  defaultUser: process.env.USER_EMAIL ?? "user",
  defaultUserName: process.env.USER_NAME ?? "hi my name is",
  defaultPassword: process.env.USER_PASSWORD ?? "password",
});

const { data, success, error } = parsedConfig;
if (!success || error) throw new Error(error.message);

export const getDB = () => {
  switch (data.db) {
    case "postgres":
      if (!process.env.POSTGRES_URL) {
        throw new Error(
          "Database postgres doesn't have a valid postgres connection string\nPlease add a env var like `POSTGRES_URL=postgresql://user:password@localhost:5432/database`",
        );
      }
      return pg({
        pool: new Pool({
          connectionString: process.env.POSTGRES_URL,
        }),
      });
    case "libsql-remote": {
      if (!process.env.LIBSQL_URL || !process.env.LIBSQL_TOKEN) {
        throw new Error(
          "Database libsql-remote doesn't have a valid configuration\nPlease add a env vars like `LIBSQL_URL=libsql://<database>.turso.io` and `LIBSQL_TOKEN=<auth_token>` or switch to 'libsql'",
        );
      }
      return libsql(
        createClient({
          url: process.env.LIBSQL_URL,
          authToken: process.env.LIBSQL_TOKEN,
        }),
      );
    }
    case "libsql-remote-embedded-replicas": {
      if (!process.env.LIBSQL_URL || !process.env.LIBSQL_TOKEN) {
        throw new Error(
          "Database libsql-remote-embedded-replicas doesn't have a valid configuration\nPlease add a env vars like `LIBSQL_URL=libsql://<database>.turso.io` and `LIBSQL_TOKEN=<auth_token>` or switch to 'libsql'",
        );
      }
      return libsql(
        createClient({
          url: `file:${process.env.DATABASE_PATH ? process.env.DATABASE_PATH : "data/local.db"}`,
          syncUrl: process.env.LIBSQL_URL,
          authToken: process.env.LIBSQL_TOKEN,
          syncInterval: 60,
        }),
      );
    }
    case "libsql":
      return libsql(
        createClient({
          url: `file:${process.env.DATABASE_PATH ? process.env.DATABASE_PATH : "data/local.db"}`,
        }),
      );
    case "sqlite":
      return bunSqlite({
        url: `file:${process.env.DATABASE_PATH ? process.env.DATABASE_PATH : "data/local.db"}`,
        onCreateConnection: (db) => {
          db.run("PRAGMA journal_mode = WAL;");
          db.run("PRAGMA synchronous = NORMAL;");
          db.run("PRAGMA busy_timeout = 5000;");
          db.run("PRAGMA foreign_keys = ON;");
        },
      });
  }
};

export const getStorage = () => {
  switch (data.storage) {
    case "local": {
      return registerLocalMediaAdapter()({
        path: process.env.LOCAL_STORAGE_PATH ?? "data/uploads",
      });
    }
    case "S3": {
      if (
        !process.env.S3_ACCESS_KEY ||
        !process.env.S3_SECRET_ACCESS_KEY ||
        !process.env.S3_URL_WITH_BUCKET
      ) {
        throw new Error(
          "Storage S3 doesn't have a valid configuration\nPlease add a env vars like `S3_ACCESS_KEY=<key>`, `S3_SECRET_ACCESS_KEY=<secret key>` and `S3_URL_WITH_BUCKET=<bucket url>`",
        );
      }
      return {
        type: "s3",
        config: {
          access_key: process.env.S3_ACCESS_KEY,
          secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
          url: process.env.S3_URL_WITH_BUCKET,
        },
      };
    }
  }
};
