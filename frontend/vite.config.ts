// vite.config.ts
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      external: ["hono/client"],
    },
  },
  resolve: {
    alias: {
      // Ensure zod resolves to the frontend node_modules
      "zod": new URL("./node_modules/zod", import.meta.url).pathname,
    },
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart({ customViteReactPlugin: true, target: "cloudflare-module" }),
    viteReact(),
  ],
});
