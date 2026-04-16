import { tool } from "@langchain/core/tools";
import z from "zod";
import { api } from "../../../axios/instance";
import { getCart, clearCart } from "./order-store";
import { sendAdminNotification, sendContactToAdmin } from "../../../providers/whatsapp";
import { env } from "../../../config/env";

export const confirmOrderTool = tool(
  async (_input, config) => {
    const threadId = config?.configurable?.thread_id ?? "default";
    const phone = config?.configurable?.phone;
    const cart = getCart(threadId);

    if (cart.length === 0) return "No hay productos en el pedido. Agregá algo antes de confirmar.";
    if (!phone) return "No se pudo identificar al cliente. Intentá de nuevo.";

    // Buscar el cliente por teléfono
    let clientId: number;
    let clientName: string = phone;
    try {
      const { data } = await api.get(`/clients/phone/${phone}`);
      clientId = data.client.id;
      clientName = data.client.localName ?? phone;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return "No encontré tu cuenta. ¿Querés registrarte primero? Solo necesito el nombre de tu local y tu dirección.";
      }
      throw error;
    }

    const payload = {
      clientId,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        pricePerUnit: item.unitPrice,
      })),
    };

    const response = await api.post("/orders", payload);
    clearCart(threadId);

    const total = cart.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const orderId = response.data.order?.id ?? "—";

    if (env.ADMIN_NUMBER) {
      const adminJid = `${env.ADMIN_NUMBER}@s.whatsapp.net`;
      const lines = cart.map((i) => `  • ${i.name} x${i.quantity} — $${i.quantity * i.unitPrice}`);
      const adminMsg = [
        `🛒 *Nuevo pedido #${orderId}*`,
        `👤 Cliente: ${clientName} (${phone})`,
        ``,
        ...lines,
        ``,
        `💰 *Total: $${total}*`,
      ].join("\n");
      await sendAdminNotification(adminMsg, adminJid);
      await sendContactToAdmin(adminJid, phone, clientName);
    }

    return `¡Pedido confirmado! Orden #${orderId} registrada. Total: $${total}. Te avisamos cuando esté listo.`;
  },
  {
    name: "confirm_order",
    description:
      "Confirma y guarda el pedido actual. El cliente se identifica automáticamente por su WhatsApp — no necesitás pedirle el ID.",
    schema: z.object({}),
  },
);
