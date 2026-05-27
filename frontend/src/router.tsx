// src/router.tsx
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { routeTree } from "./routeTree.gen.js";
import type { AuthState } from "./utils/auth";

export function createRouter() {
  const queryClient = new QueryClient();

  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient,
      auth: {
        isAuthenticated: false,
      } as AuthState,
    },
    defaultPreload: "intent",
    // Since we're using React Query, we don't want loader calls to ever be stale
    // This will ensure that the loader is always called when the route is preloaded or visited
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });

  return routerWithQueryClient(router, queryClient);
}

export type Router = ReturnType<typeof createRouter>;

export const getRouter = async () => createRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: Router;
  }
}
