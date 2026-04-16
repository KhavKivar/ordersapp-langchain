import { tool } from "@langchain/core/tools";
import get_list_of_products from "../api/get-list-of-products";
import { Product } from "../api/product.schema";
import { toCapitalized } from "../../../utils/format";

export const listProductsTool = tool(
  async () => {
    const products = await get_list_of_products();
    const listOfProducts = products.products;
    let responseMessage = "Lista de productos y precios:\n";
    const typeOfProduct = [
      ...new Set(listOfProducts.map((item: Product) => item.type)),
    ];

    for (const type of typeOfProduct) {
      responseMessage += `\n-- ${toCapitalized(type as string)} --\n`;
      const productsOfType = listOfProducts.filter(
        (item: Product) => item.type === type,
      );
      for (const product of productsOfType) {
        responseMessage += `${product.name}, precio: $ ${product.sellPriceClient}\n`;
      }
    }

    return responseMessage;
  },
  {
    name: "list_products",
    description:
      "Devuelve la lista completa de productos y licores con sus precios actuales. No recibe parámetros.",

  },
);
