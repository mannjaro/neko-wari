import { z } from "zod";

// Payment category schema and type
export const PaymentCategorySchema = z.enum([
  "rent",
  "utilities", 
  "furniture",
  "daily",
  "transportation",
  "other",
]);
export type PaymentCategory = z.infer<typeof PaymentCategorySchema>;

// Update Cost transaction data schema
export const UpdateCostDataSchema = z.object({
  userId: z.string().optional(),
  category: PaymentCategorySchema.optional(),
  memo: z.string().optional(),
  price: z.number().optional(),
  updatedAt: z.string(),
});
export type UpdateCostData = z.infer<typeof UpdateCostDataSchema>;