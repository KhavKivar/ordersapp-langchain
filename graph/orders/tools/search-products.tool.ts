import { tool } from "@langchain/core/tools";
import z from "zod";
import Fuse from "fuse.js";
import get_list_of_products from "../../product-catalog/api/get-list-of-products";

export const searchProductsTool = tool(
  async (input) => {
    const { products } = await get_list_of_products();

    const fuse = new Fuse(products, { keys: ["name"], threshold: 0.4 });
    const results = fuse.search(input.name);

    if (results.length === 0) return "No se encontró ningún producto con ese nombre.";

    const match = results[0].item;
    return `ID: ${match.id} | ${match.name} — $${match.sellPriceClient}`;
  },
  {
    name: "search_products",
    description:
      "Busca un producto por nombre (búsqueda fuzzy) y devuelve el mejor resultado con su ID y precio. Llamala una vez por cada producto que el usuario mencione.",
    schema: z.object({
      name: z.string().describe("Nombre del producto a buscar"),
    }),
  },
);
