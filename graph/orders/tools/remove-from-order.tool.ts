import { tool } from "@langchain/core/tools";
import z from "zod";
import Fuse from "fuse.js";
import { getCart } from "./order-store";

export const removeFromOrderTool = tool(
  async (input, config) => {
    const threadId = config?.configurable?.thread_id ?? "default";
    const cart = getCart(threadId);

    if (cart.length === 0) return "El pedido está vacío, no hay nada que eliminar.";

    const fuse = new Fuse(cart, {
      keys: ["name"],
      threshold: 0.4,
    });

    const results = fuse.search(input.name);
    if (results.length === 0) return `No encontré ningún producto llamado "${input.name}" en tu pedido actual.`;

    const item = results[0].item;
    const idx = cart.findIndex((c) => c.productId === item.productId);
    
    cart.splice(idx, 1);
    return `✅ ${item.name} eliminado del pedido.`;
  },
  {
    name: "remove_from_order",
    description: "Elimina un producto completo del pedido actual por su nombre.",
    schema: z.object({
      name: z.string().describe("Nombre del producto a eliminar"),
    }),
  },
);
