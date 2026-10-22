import fs from "node:fs";
import path from "node:path";
import { serveStatic } from "@hono/bun";
// import { logger } from "hono/logger";
import { createFrameworkApp } from "bknd/adapter";
import { Hono } from "hono";
import config from "../bknd.config";

export const customLogger = (message: string, ...rest: string[]) => {
  console.log(message, ...rest);
};

const app = new Hono();
// app.use(logger(customLogger));

if (import.meta.env.PROD) {
  app.use(
    serveStatic({
      root: "./client",
      precompressed: true,
      onFound: (_path, c) => {
        c.header("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
}

const handler = await createFrameworkApp(config);
app.all("/api/*", async (c) => await handler.server.fetch(c.req.raw));

// if (process.env.NODE_ENV === "production") {
//   app.use("/*", serveStatic({ root: "./dist/client", precompressed: true }));
// }

const isProd = import.meta.env.PROD;

let cssPath = "/src/index.css";
if (isProd) {
  try {
    const manifestPath = path.resolve(
      process.cwd(),
      "client/.vite/manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const entry = manifest["src/main.tsx"];
    if (entry.css && entry.css.length > 0) {
      cssPath = `/${entry.css[0]}`;
    }
  } catch (e) {
    console.error("Failed to read Vite manifest:", e);
  }
}

app.get("*", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Home</title>
    <link rel="stylesheet" href=${cssPath} />
    <link rel="shortcut icon" href="/favicon.svg" type="image/x-icon">
    <script>
      (function () {
        const savedTheme = localStorage.getItem('theme') || 'system';
        let resolvedTheme = savedTheme;
        if (savedTheme === 'system') {
            resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };
        document.documentElement.setAttribute('data-theme', JSON.parse(resolvedTheme));
      })();
    </script>
        
        ${
          isProd
            ? ""
            : `
          <script type="module" src="/@vite/client"></script>
          <script type="module">
            import RefreshRuntime from '/@react-refresh'
            RefreshRuntime.injectIntoGlobalHook(window)
            window.$RefreshReg$ = () => {}
            window.$RefreshSig$ = () => (type) => type
            window.__vite_plugin_react_preamble_installed__ = true
          </script>
        `
        }
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="${isProd ? "/static/main.js" : "/src/main.tsx"}"></script>
      </body>
    </html>
  `);
});

export default isProd
  ? Bun.serve({
      fetch(req, server) {
        return app.fetch(req, { ip: server.requestIP(req) });
      },
      maxRequestBodySize: Number(
        process.env.MAX_BODY_SIZE || 1024 * 1024 * 1024,
      ),
      port: process.env.PORT || 3000,
    })
  : app;
