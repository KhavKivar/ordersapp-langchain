import { tool } from "@langchain/core/tools";
import z from "zod";
import Fuse from "fuse.js";
import get_list_of_products from "../api/get-list-of-products";
import { Product } from "../api/product.schema";
import { toCapitalized } from "../../../utils/format";

export const searchProductsTool = tool(
  async (input) => {
    const products = await get_list_of_products();
    let filteredProducts: Product[] = products.products;

    if (input.category) {
      filteredProducts = filteredProducts.filter(
        (p) => p.type.toLowerCase() === input.category!.toLowerCase(),
      );
    }

    if (filteredProducts.length === 0) {
      return "No se encontraron productos con los filtros indicados.";
    }

    if (input.name) {
      const fuse = new Fuse(filteredProducts, {
        keys: ["name"],
        threshold: 0.4,
      });
      const results = fuse.search(input.name);
      if (results.length === 0)
        return "No se encontró ningún producto con ese nombre.";
      const match = results[0].item;
      return `${match.name} (${toCapitalized(match.type)}), precio: $ ${match.sellPriceClient}`;
    }

    let responseMessage = "Productos encontrados:\n";
    const types = [...new Set(filteredProducts.map((p) => p.type))];
    for (const type of types) {
      responseMessage += `\n-- ${toCapitalized(type)} --\n`;
      for (const p of filteredProducts.filter((x) => x.type === type)) {
        responseMessage += `${p.name}, precio: $ ${p.sellPriceClient}\n`;
      }
    }
    return responseMessage;
  },
  {
    name: "search_products",
    description:
      "Busca el precio de un producto específico por nombre (fuzzy) o filtra por categoría. Usala cuando el usuario pregunta por un producto o licor concreto.",
    schema: z.object({
      name: z
        .string()
        .optional()
        .describe("Nombre del producto a buscar (acepta errores de escritura)"),
      category: z
        .string()
        .optional()
        .describe("Categoría del producto (ej: 'whisky', 'ron', 'tequila', 'gin')"),
    }),

  },
);
