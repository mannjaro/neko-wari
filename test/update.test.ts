// index.test.ts
import { Hono } from "hono";
import { testClient } from "hono/testing";
import { describe, it, expect } from "vitest"; // Or your preferred test runner
import { detailUpdate, monthlyGet } from "../lambda/backend/app";
import { costDataItemSchema } from "../lambda/backend/schemas/responseSchema";

describe("Get monthly data", () => {
  const client = testClient(monthlyGet);

  it("should return monthly details", async () => {
    const res = await client.dashboard.monthly.$get({
      query: {
        month: "08",
        year: "2025",
      },
    });
    console.log(await res.json());
    // Assertions
    expect(res.status).toBe(200);
  });
});

describe("Update Endpoint", () => {
  // Create the test client from the app instance
  const client = testClient(detailUpdate);

  it("should return search results", async () => {
    // Call the endpoint using the typed client
    // Notice the type safety for query parameters (if defined in the route)
    // and the direct access via .$get()
    const res = await client.user[":uid"].detail[":timestamp"].$put({
      param: {
        uid: "****",
        timestamp: "1755818361304",
      },
      json: {
        memo: "新幹線1",
      },
    });
    const parsedRes = costDataItemSchema.parse(await res.json());

    expect(parsedRes.Memo).toBe("新幹線1");
    // Assertions
    expect(res.status).toBe(200);
  });
});
