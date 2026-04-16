import { tool } from "@langchain/core/tools";
import z from "zod";
import { api } from "../../../axios/instance";

export const getClientTool = tool(
  async (_input, config) => {
    const phone = config?.configurable?.phone;
    if (!phone) return "No se pudo obtener el teléfono del cliente.";

    try {
      const response = await api.get(`/clients/phone/${phone}`);
      const { client } = response.data;
      return `Cliente encontrado: ${client.localName} (ID: ${client.id})`;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return "No existe un cliente registrado con este número. Pedile que se registre primero.";
      }
      throw error;
    }
  },
  {
    name: "get_client",
    description:
      "Busca el cliente actual por su número de WhatsApp. Usala para obtener el ID del cliente antes de confirmar un pedido.",
    schema: z.object({}),
  },
);
