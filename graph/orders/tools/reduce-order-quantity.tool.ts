import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Fuse from "fuse.js";
import { getCart } from "./order-store";

export const reduceOrderQuantityTool = tool(
  async (input, config) => {
    const threadId = config?.configurable?.thread_id ?? "default";
    const cart = getCart(threadId);

    if (cart.length === 0) return "El pedido está vacío.";

    const fuse = new Fuse(cart, {
      keys: ["name"],
      threshold: 0.4,
    });

    const results = fuse.search(input.name);
    if (results.length === 0) return `No encontré ningún producto llamado "${input.name}" en tu pedido.`;

    const item = results[0].item;

    if (input.quantity >= item.quantity) {
      const idx = cart.findIndex((c) => c.productId === item.productId);
      cart.splice(idx, 1);
      return `✅ ${item.name} eliminado del pedido (querías quitar ${input.quantity} y tenías ${item.quantity}).`;
    }

    item.quantity -= input.quantity;
    return `✅ ${item.name}: cantidad reducida. Ahora tenés ${item.quantity} unidades.`;
  },
  {
    name: "reduce_order_quantity",
    description:
      "Reduce la cantidad de un producto en el pedido actual por su nombre. Si la cantidad a quitar es igual o mayor a la existente, lo elimina.",
    schema: z.object({
      name: z.string().describe("Nombre del producto"),
      quantity: z.number().min(1).describe("Cantidad a quitar del pedido"),
    }),
  },
);
