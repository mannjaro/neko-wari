import { z } from "zod";

export const CreateCostDetailSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
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

export const CreateUserSchema = z.object({
  email: z.email(),
  displayName: z.string(),
  role: z.union([z.literal("admin"), z.literal("member"), z.literal("viewer")]),
});
