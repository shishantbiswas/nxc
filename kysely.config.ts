import { defineConfig } from "kysely-ctl";
import { dialect } from "./src/server/database";

export default defineConfig({
  dialect,
  migrations: {
    migrationFolder: "./src/server/database/migrations",
  },
  //   plugins: [],
  //   seeds: {
  //     seedFolder: "seeds",
  //   }
});
