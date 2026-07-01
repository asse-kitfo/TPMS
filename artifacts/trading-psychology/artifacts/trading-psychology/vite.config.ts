import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const REAL_ROOT = "/home/runner/workspace/artifacts/trading-psychology";

const rawPort = process.env.PORT || "21714";
const port = Number(rawPort);
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(REAL_ROOT, "src"),
      "@assets": path.resolve(REAL_ROOT, "../../attached_assets"),
      "@workspace/api-zod": path.resolve(REAL_ROOT, "../../lib/api-zod/src/index.ts"),
      "@workspace/api-client-react": path.resolve(REAL_ROOT, "../../lib/api-client-react/src/index.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: REAL_ROOT,
  build: {
    outDir: path.resolve(REAL_ROOT, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
