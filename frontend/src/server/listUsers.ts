import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { UserListType } from "../../../lambda/backend/app";

export const listUsers = createServerFn({
  method: "GET",
}).handler(async () => {
  const client = hc<UserListType>(env.BACKEND_API);
  const response = await client.users.$get();
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
});
