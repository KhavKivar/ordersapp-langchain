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

    const searchNames = input.names || (input.name ? [input.name] : []);

    if (searchNames.length > 0) {
      const fuse = new Fuse(filteredProducts, {
        keys: ["name"],
        threshold: 0.4,
      });

      const allResults = new Map<number, Product>();
      
      for (const nameToSearch of searchNames) {
        const results = fuse.search(nameToSearch);
        for (const res of results) {
          allResults.set(res.item.id, res.item);
        }
      }

      if (allResults.size === 0) {
        return `No se encontraron productos para: ${searchNames.join(", ")}.`;
      }

      let responseMessage = `🔍 Resultados encontrados (${allResults.size}):\n`;
      for (const match of allResults.values()) {
        const priceStr = "$" + match.sellPriceClient.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        responseMessage += `- ${match.name} (${toCapitalized(match.type)}), precio: ${priceStr}\n`;
      }
      
      return responseMessage.trim();
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
      "Busca productos por nombre (fuzzy) o filtra por categoría. Permite buscar varios nombres a la vez pasando una lista.",
    schema: z.object({
      name: z
        .string()
        .optional()
        .describe("Nombre de un producto a buscar (obsoleto, preferir 'names')"),
      names: z
        .array(z.string())
        .optional()
        .describe("Lista de nombres de productos a buscar simultáneamente"),
      category: z
        .string()
        .optional()
        .describe("Categoría del producto (ej: 'whisky', 'ron', 'tequila', 'gin')"),
    }),
    returnDirect: true,
  },
);
