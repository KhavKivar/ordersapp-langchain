import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { api } from "../../../axios/instance";

export const createClientTool = tool(
  async (input, config) => {
    const phone = config?.configurable?.phone ?? "";
    const phoneId = config?.configurable?.phoneId ?? null;

    try {
      const response = await api.post("/clients", {
        ...input,
        phone,
        phoneId,
      });
      const { client } = response.data;
      return `Cliente creado exitosamente. Bienvenido, ${client.localName}! Ya podés hacer pedidos.`;
    } catch (error: any) {
      if (error.response?.status === 409) {
        return "Ya existe un cliente registrado con ese teléfono. Si querés hacer un pedido, podés continuar directamente.";
      }
      throw error;
    }
  },
  {
    name: "create_client",
    description:
      "Crea una cuenta nueva para el cliente. Solo necesitás el nombre del local y la dirección — el teléfono se obtiene automáticamente de WhatsApp.",
    schema: z.object({
      localName: z
        .string()
        .min(4)
        .describe("Nombre del local o negocio del cliente (mínimo 4 caracteres)"),
      address: z.string().describe("Dirección del local o negocio"),
    }),
    returnDirect: true,
  },
);
