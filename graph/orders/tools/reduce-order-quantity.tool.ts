import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getCart } from "./order-store";

export const reduceOrderQuantityTool = tool(
  async (input, config) => {
    const threadId = config?.configurable?.thread_id ?? "default";
    const cart = getCart(threadId);

    const idx = cart.findIndex((c) => c.productId === input.productId);
    if (idx === -1) return "Ese producto no está en el pedido.";

    const item = cart[idx];

    if (input.quantity >= item.quantity) {
      cart.splice(idx, 1);
      return `${item.name} eliminado del pedido (se solicitó quitar ${input.quantity} y había ${item.quantity}).`;
    }

    item.quantity -= input.quantity;
    return `${item.name}: cantidad reducida a ${item.quantity} unidades.`;
  },
  {
    name: "reduce_order_quantity",
    description:
      "Reduce la cantidad de un producto en el pedido actual. Si la cantidad a quitar es igual o mayor a la existente, elimina el producto del pedido.",
    schema: z.object({
      productId: z.number().describe("ID del producto"),
      quantity: z.number().min(1).describe("Cantidad a quitar del pedido"),
    }),
  },
);
