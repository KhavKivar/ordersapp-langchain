import { tool } from "@langchain/core/tools";
import z from "zod";
import { getCart } from "./order-store";

export const viewOrderTool = tool(
  async (_input, config) => {
    const threadId = config?.configurable?.thread_id ?? "default";
    const cart = getCart(threadId);

    if (cart.length === 0) return "El pedido está vacío.";

    let msg = "Pedido actual:\n";
    let total = 0;
    for (const item of cart) {
      const subtotal = item.quantity * item.unitPrice;
      const priceStr = item.unitPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const subtotalStr = subtotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      
      msg += `• ${item.name}: ${item.quantity} x $${priceStr} = $${subtotalStr}\n`;
      total += subtotal;
    }
    const totalStr = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    msg += `\nTotal: $${totalStr}`;
    return msg;
  },
  {
    name: "view_order",
    description: "Muestra el contenido actual del pedido con precios y total.",
    schema: z.object({}),
  },
);
