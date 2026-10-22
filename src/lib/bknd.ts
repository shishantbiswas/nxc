import { Api } from "bknd/client";

export const api = new Api({
  host: `http://localhost:${process.env.PORT ?? 3000}`,
});