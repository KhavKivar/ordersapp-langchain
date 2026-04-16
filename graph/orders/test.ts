import "dotenv/config";
import { ordersWorkflow } from "./index";
import { MemorySaver } from "@langchain/langgraph";
import { api } from "../../axios/instance";

const graph = ordersWorkflow.compile({ checkpointer: new MemorySaver() });

// ─── setup ───────────────────────────────────────────────────────────────────

const { data: clientData } = await api.post("/clients", {
  localName: "Test Orders Bot",
  address: "Calle Falsa 123",
  phone: `test-${Date.now()}`,
});
const clientId: number = clientData.client.id;
console.log(`Cliente creado (ID: ${clientId})\n`);

const config = { configurable: { thread_id: "test-orders" } };

// ─── flujo real ───────────────────────────────────────────────────────────────

async function turn(message: string) {
  const result = await graph.invoke(
    { messages: [{ role: "user", content: message }] },
    config,
  );
  const response = result.messages.at(-1)?.content;
  console.log(`👤 ${message}`);
  console.log(`🤖 ${response}\n`);
}

await turn("quiero pedir 2 havana club especial y 1 flor de caña 7 años");
await turn("mostrá el pedido");
await turn(`confirmá el pedido, mi ID de cliente es ${clientId}`);

// ─── cleanup ──────────────────────────────────────────────────────────────────

try {
  const { data: orderData } = await api.get(`/orders/client/${clientId}`);
  const orderId = orderData.orders?.at(-1)?.id;
  if (orderId) {
    await api.delete(`/orders/${orderId}`);
    console.log(`Orden #${orderId} eliminada.`);
  }
} catch {
  console.log("No se encontraron órdenes para limpiar.");
}

try {
  await api.delete(`/clients/${clientId}`);
  console.log(`Cliente #${clientId} eliminado.`);
} catch {
  console.log(`Cliente #${clientId}: no se pudo eliminar (tiene órdenes asociadas).`);
}
