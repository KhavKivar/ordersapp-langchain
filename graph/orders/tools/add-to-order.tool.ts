import { tool } from "@langchain/core/tools";
import z from "zod";
import get_list_of_products from "../../product-catalog/api/get-list-of-products";
import { getCart } from "./order-store";

export const addToOrderTool = tool(
  async (input, config) => {
    const threadId = config?.configurable?.thread_id ?? "default";
    const { products } = await get_list_of_products();
    const cart = getCart(threadId);

    const added: string[] = [];
    const notFound: number[] = [];

    for (const item of input.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        notFound.push(item.productId);
        continue;
      }

      const existing = cart.find((c) => c.productId === item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        cart.push({
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.sellPriceClient,
        });
      }
      added.push(`${product.name} x${item.quantity}`);
    }

    const lines: string[] = [];
    if (added.length) lines.push(`Agregado al pedido: ${added.join(", ")}.`);
    if (notFound.length) lines.push(`No se encontraron productos con ID: ${notFound.join(", ")}.`);
    return lines.join("\n");
  },
  {
    name: "add_to_order",
    description:
      "Agrega uno o más productos al pedido actual. Requiere el ID del producto (obtenido con search_products) y la cantidad.",
    schema: z.object({
      items: z.array(
        z.object({
          productId: z.number().describe("ID del producto"),
          quantity: z.number().min(1).describe("Cantidad a agregar"),
        }),
      ).min(1),
    }),
  },
);
