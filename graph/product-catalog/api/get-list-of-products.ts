import { api } from "../../../axios/instance";
import { ProductsResponse } from "./product.schema";

export default async function get_list_of_products() {
  const response = await api.get("/products");
  const data: ProductsResponse = response.data;
  return data;
}
