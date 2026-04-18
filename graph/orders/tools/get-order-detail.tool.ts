import { tool } from "@langchain/core/tools";
import z from "zod";
import { api } from "../../../axios/instance";

export const getOrderDetailTool = tool(
  async ({ orderId }) => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      const o = data.order;

      const lines = o.lines.map(
        (l: any) => `  • ${l.productName} x${l.quantity} — $${l.lineTotal}`,
      );
      const total = o.lines.reduce(
        (acc: number, l: any) => acc + l.lineTotal,
        0,
      );

      return [
        `Pedido #${o.orderId} — ${o.status}`,
        `Fecha: ${new Date(o.createdAt).toLocaleDateString("es-AR")}`,
        ``,
        ...lines,
        ``,
        `Total: $${total}`,
      ].join("\n");
    } catch (error: any) {
      if (error.response?.status === 404)
        return `No encontré el pedido #${orderId}.`;
      throw error;
    }
  },
  {
    name: "get_order_detail",
    description:
      "Muestra el detalle completo de un pedido específico: productos, cantidades, precios y total. Usala solo cuando el cliente pida el detalle de un pedido puntual.",
    schema: z.object({
      orderId: z.number().describe("ID del pedido a consultar"),
    }),
  },
);
