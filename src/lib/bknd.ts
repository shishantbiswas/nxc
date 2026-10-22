import { Api } from "bknd/client";

export const api = new Api({
  host: new URL(window.location.href).origin,
});