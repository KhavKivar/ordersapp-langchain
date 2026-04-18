import { tool } from "@langchain/core/tools";
import z from "zod";
import { api } from "../../../axios/instance";

export const getClientOrdersTool = tool(
  async (_input, config) => {
    const phone = config?.configurable?.phone;
    if (!phone) return "No se pudo identificar al cliente.";

    let clientId: number;
    try {
      const { data } = await api.get(`/clients/phone/${phone}`);
      clientId = data.client.id;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return "No encontré tu cuenta. ¿Querés registrarte primero?";
      }
      throw error;
    }

    try {
      const { data } = await api.get(`/orders/client/${clientId}`);
      const orders: any[] = data.orders;

      if (orders.length === 0) return "No tenés pedidos registrados todavía.";

      const lines = orders.map((o) => {
        const total =
          o.lines?.reduce(
            (acc: number, l: any) => acc + (l.lineTotal ?? 0),
            0,
          ) ?? 0;
        const status = o.status ?? "—";
        const date = o.createdAt
          ? new Date(o.createdAt).toLocaleDateString("es-AR")
          : "—";
        return `• Pedido #${o.orderId} — $${total} — ${status} (${date})`;
      });

      return `Tus pedidos:\n${lines.join("\n")}`;
    } catch {
      throw new Error("No se pudo obtener el historial de pedidos.");
    }
  },
  {
    name: "get_client_orders",
    description:
      "Muestra el historial de pedidos del cliente actual. Usala cuando el cliente quiera ver sus pedidos anteriores o el estado de un pedido.",
    schema: z.object({}),
  },
);
