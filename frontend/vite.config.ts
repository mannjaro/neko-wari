// vite.config.ts

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Externalize packages that should not be bundled for client builds
        if (id === "hono/client") return true;
        if (id === "youch" || id.startsWith("youch/")) return true;
        if (id === "exsolve" || id.startsWith("exsolve/")) return true;
        if (id === "unenv" || id.startsWith("unenv/")) return true;
        if (id === "pathe" || id.startsWith("pathe/")) return true;
        return false;
      },
    },
  },
  define: {
    global: "window",
  },
  resolve: {
    alias: {
      // Ensure zod resolves to the frontend node_modules
      zod: new URL("./node_modules/zod", import.meta.url).pathname,
    },
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart({ customViteReactPlugin: true, target: "cloudflare-module" }),
    viteReact(),
  ],
});
