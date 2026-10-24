import path from "node:path";
import devServer from "@hono/vite-dev-server";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { type BuildEnvironmentOptions, defineConfig, loadEnv } from "vite";

const ssrBuildConfig: BuildEnvironmentOptions = {
  ssr: true,
  outDir: "dist/server",
  ssrEmitAssets: true,
  copyPublicDir: false,
  minify: true,
  emptyOutDir: true,
  rolldownOptions: {
    input: path.resolve(import.meta.dirname, "src/server.ts"),
    external: ["sharp", "pg", "@libsql/client"],
    output: {
      entryFileNames: "[name].js",
      chunkFileNames: "assets/[name]-[hash].js",
      assetFileNames: "assets/[name]-[hash][extname]",
    },
  },
};

const clientBuildConfig: BuildEnvironmentOptions = {
  outDir: "dist/client",
  emitAssets: true,
  manifest: true,
  minify: true,
  cssMinify: true,
  rolldownOptions: {
    input: path.resolve(import.meta.dirname, "src/main.tsx"),
    output: {
      entryFileNames: "static/main.js",
    },
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env = env;

  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      babel({
        plugins: ["babel-plugin-react-compiler"],
      }),
      devServer({
        env,
        entry: "src/server.ts",
        exclude: [
          /.*\.tsx?($|\?)/,
          /^(?!.*\/__admin).*\.(s?css|less)($|\?)/,
          /^(?!\/api\/).*\.(ico|mp4|jpg|jpeg|svg|png|vtt|mp3|js|config.ts|ts|md)($|\?)/,
          /^\/@.+$/,
          /\/components.*?\.json.*/,
          /^\/(public|assets|static)\/.+/,
          /^\/node_modules\/.*/,
        ],
      }),
    ],
    ssr: {
      noExternal: process.env.NODE_ENV === "production" || undefined,
    },
    environments: {
      client: {
        build: clientBuildConfig,
      },
      ssr: {
        build: ssrBuildConfig,
      },
    },
    builder: {
      async buildApp(builder) {
        await builder.build(builder.environments.client);
        await builder.build(builder.environments.ssr);
      },
    },
    optimizeDeps: {
      include: ["picocolors"],
    },
    server: {
      port: 3000,
      watch: {
        ignored: ["**/uploads/**"],
      },
    },
  };
});
