import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { api } from "../../../axios/instance";
import { clearClientProfileCache } from "../api/get-client-profile";

export const updateClientTool = tool(
  async (input, config) => {
    try {
      const response = await api.patch(`/clients/${input.id}`, {
        ...(input.localName && { localName: input.localName }),
        ...(input.address && { address: input.address }),
      });
      const { client } = response.data;
      const phone = config?.configurable?.phone;
      if (phone) clearClientProfileCache(phone);
      return `Datos actualizados correctamente. Local: ${client.localName}, Dirección: ${client.address}.`;
    } catch (error: any) {
      if (error.response?.status === 404) return "Cliente no encontrado.";
      throw error;
    }
  },
  {
    name: "update_client",
    description:
      "Actualiza el nombre del local y/o dirección del cliente. Requiere el ID del cliente (obtenido con get_client_profile).",
    schema: z.object({
      id: z.number().describe("ID del cliente"),
      localName: z.string().min(4).optional().describe("Nuevo nombre del local"),
      address: z.string().optional().describe("Nueva dirección"),
    }),
  },
);
