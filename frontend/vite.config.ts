// vite.config.ts

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../lambda/shared"),
    },
  },
  optimizeDeps: {
    include: ["zod"],
  },
  ssr: {
    noExternal: ["zod"],
  },
});
