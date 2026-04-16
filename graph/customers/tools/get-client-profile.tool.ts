import { tool } from "@langchain/core/tools";
import { z } from "zod";
import getClientProfile from "../api/get-client-profile";

export const getClientProfileTool = tool(
  async (_input, config) => {
    const phone = config?.configurable?.phone;
    if (!phone) return "No se pudo obtener el teléfono del cliente.";

    const client = await getClientProfile(phone);
    if (!client) return "NOT_FOUND";
    return JSON.stringify(client);
  },
  {
    name: "get_client_profile",
    description:
      "Obtiene el perfil completo del cliente actual (nombre del local, dirección). Usala SIEMPRE al inicio para verificar si el cliente ya está registrado.",
    schema: z.object({}),
  },
);
