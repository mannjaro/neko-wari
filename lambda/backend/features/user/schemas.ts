import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.email(),
  displayName: z.string(),
  role: z.union([z.literal("admin"), z.literal("member"), z.literal("viewer")]),
});
