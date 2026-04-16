import z from "zod";

export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  size_ml: z.number(),
  sellPriceClient: z.number(),
  buyPriceSupplier: z.number(),
  description: z.string(),
});

export type Product = z.infer<typeof productSchema>;

export const productsResponseSchema = z.object({
  products: z.array(productSchema),
});

export type ProductsResponse = z.infer<typeof productsResponseSchema>;
