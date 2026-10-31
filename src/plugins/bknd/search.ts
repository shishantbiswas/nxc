import { type AppPlugin, DatabaseEvents } from "bknd";
import type { Nodes } from "../../../bknd-types";
import {
  createSearchTable,
  deleteSearchItem,
  insertSearchItem,
  searchFiles,
  updateSearchItem,
} from "../../lib/search";

export const searchPlugin: AppPlugin = (app) => ({
  name: "search",
  onBuilt: async () => {
    const db = app.connection.kysely;
    await createSearchTable(db);

    app.emgr.onEvent(DatabaseEvents.MutatorInsertAfter, async (event) => {
      if (event.params.entity.name === "nodes") {
        const node: Partial<Nodes> = event.params.data;
        await insertSearchItem(db, {
          id: String(node.id),
          content: node.name as string,
          type: node.type as string,
          metadata: node.metadata,
          mime_type: node.mime_type,
        });
      }
    });

    app.emgr.onEvent(DatabaseEvents.MutatorDeleteAfter, async (event) => {
      if (event.params.entity.name === "nodes") {
        const id = event.params.entityId as string;
        await deleteSearchItem(db, id);
      }
    });

    app.emgr.onEvent(DatabaseEvents.MutatorUpdateAfter, async (event) => {
      if (event.params.entity.name === "nodes") {
        const node: Partial<Nodes> = event.params.data;
        await updateSearchItem(db, String(node.id), {
          id: String(node.id),
          content: node.name as string,
          type: node.type as string,
          metadata: node.metadata,
          mime_type: node.mime_type,
        });
      }
    });

    app.server.get("/api/search", async (c) => {
      const headers = c.req.raw.headers;

      const search = c.req.query("q");
      if (!search) {
        return c.json(
          { error: true, message: "'q' is required" },
          400, // Bad Request
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
      const ftsRes = await searchFiles(db, search);
      
      if (ftsRes.length === 0) {
        console.log(ftsRes)
        return c.json({ result: [] });
      }
      
      const ids = ftsRes.map((it) => it.id);
      const { data } = await api.data.readMany("nodes", {
        with: ["media"],
        where: {
          id: { $in: ids },
        },
      });

      return c.json({ result: data as (Omit<Nodes, "id"> & { id: string })[] });
    });
  },
});
