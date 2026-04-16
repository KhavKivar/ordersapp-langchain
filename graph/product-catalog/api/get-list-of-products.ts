import { api } from "../../../axios/instance";
import { ProductsResponse } from "./product.schema";

const TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
let cache: { data: ProductsResponse; expiresAt: number } | null = null;

export default async function get_list_of_products() {
  if (cache && Date.now() < cache.expiresAt) return cache.data;
  console.log("Fetching products from API...");
  const response = await api.get("/products");
  cache = { data: response.data, expiresAt: Date.now() + TTL_MS };
  return cache.data;
}
