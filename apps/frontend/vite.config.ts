import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(rootDir, "public");
const emulatorDir = join(publicDir, "emulator");
const emulatorLoader = join(emulatorDir, "data/loader.js");

const MIME: Record<string, string> = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
  ".html": "text/html",
  ".zip": "application/zip",
};

function serveEmulatorPlugin(): Plugin {
  return {
    name: "serve-emulator",
    configureServer(server) {
      if (!existsSync(emulatorLoader)) {
        server.config.logger.warn(
          "\n  EmulatorJS not installed. Run: bun run setup:emulator\n",
        );
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.startsWith("/emulator/")) return next();

        const rel = decodeURIComponent(url.slice("/emulator/".length));
        const filePath = join(emulatorDir, rel);

        if (!filePath.startsWith(emulatorDir)) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }

        if (!existsSync(filePath)) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }

        const st = statSync(filePath);
        if (!st.isFile()) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }

        res.setHeader("Content-Type", MIME[extname(filePath)] ?? "application/octet-stream");
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root: rootDir,
  publicDir,
  plugins: [react(), serveEmulatorPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
