import "dotenv/config";
import { customersGraph } from "./index";
import { api } from "../../axios/instance";

const testClient = {
  localName: "La Bodega del Sur",
  address: "Av. Siempreviva 742",
  phone: "3001234567",
};

// 1. Invocar el grafo → crea el cliente
const result = await customersGraph.invoke({
  messages: [
    {
      role: "user",
      content: `quiero registrarme, mi local es ${testClient.localName}, dirección ${testClient.address}, teléfono ${testClient.phone}`,
    },
  ],
});
console.log("Respuesta del agente:", result.messages.at(-1)?.content);

// 2. Buscar el cliente creado por localName para obtener el ID
const { data } = await api.get(`/clients/localName/${encodeURIComponent(testClient.localName)}`);
const clientId = data.client.id;
console.log("Cliente encontrado con ID:", clientId);

// 3. Cleanup
await api.delete(`/clients/${clientId}`);
console.log("Cliente de prueba eliminado.");
