import { z } from "zod";

export const CreateCostDetailSchema = z.object({
  userId: z.string().optional(), // Now optional - will be extracted from JWT token
  displayName: z.string().optional(), // Optional display name override
  category: z.union([
    z.literal("rent"),
    z.literal("utilities"),
    z.literal("furniture"),
    z.literal("daily"),
    z.literal("transportation"),
    z.literal("other"),
  ]),
  memo: z.string(),
  price: z.number(),
});

export const UpdateCostDetailSchema = z
  .object({
    userId: z.string(),
    category: z.union([
      z.literal("rent"),
      z.literal("utilities"),
      z.literal("furniture"),
      z.literal("daily"),
      z.literal("transportation"),
      z.literal("other"),
    ]),
    memo: z.string(),
    price: z.number(),
  })
  .partial();
