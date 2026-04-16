import { tool } from "@langchain/core/tools";
import z from "zod";
import { getCart } from "./order-store";

export const removeFromOrderTool = tool(
  async (input, config) => {
    const threadId = config?.configurable?.thread_id ?? "default";
    const cart = getCart(threadId);

    const idx = cart.findIndex((c) => c.productId === input.productId);
    if (idx === -1) return "Ese producto no está en el pedido.";

    const item = cart[idx];
    cart.splice(idx, 1);
    return `${item.name} eliminado del pedido.`;
  },
  {
    name: "remove_from_order",
    description: "Elimina un producto del pedido actual por su ID.",
    schema: z.object({
      productId: z.number().describe("ID del producto a eliminar"),
    }),
  },
);
