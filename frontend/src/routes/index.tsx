// src/routes/index.tsx
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { hc } from "hono/client";

import type { AppType } from "../../../lambda/backend/app.js";

export const Route = createFileRoute("/")({
  component: Home,
});

const queryClient = new QueryClient();
const client = hc<AppType>("/api");

function Home() {
  const state = Route.useLoaderData();

  return (
    <Button type="button" onClick={() => {}}>
      Add 1 to {state}?
    </Button>
  );
}
