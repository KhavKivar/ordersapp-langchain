import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
  START,
  END,
  MemorySaver,
} from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { productCatalogGraph } from "./product-catalog/index";
import { ordersGraph } from "./orders/index";
import { customersGraph } from "./customers/index";
import { readFileSync } from "node:fs";
import { MODELS } from "../config/models";
import { z } from "zod";

const systemPromptRouter = readFileSync(
  new URL("./prompts/main-router.xml", import.meta.url),
  "utf8",
);

const WELCOME_MESSAGE = `¡Bienvenido a *Vasvani Shop* 🛒

Soy tu asistente virtual y puedo ayudarte con:

📋 *Ver productos y precios*
  → "¿Qué productos tienen?"
  → "¿Cuánto vale el Jack Daniel's?"
  → "Mostrame los whiskies disponibles"

🛍️ *Hacer un pedido*
  → "Quiero hacer un pedido"
  → "Me llevó una botella de Havana Club"

📦 *Ver mis pedidos*
  → "Mostrame mis pedidos"
  → "¿Cuál fue mi último pedido?"
  → "Detalle del pedido #4"

👤 *Crear tu cuenta*
  → "Quiero registrarme"
  → "Crear mi cuenta"

¿En qué te puedo ayudar?`;

const State = Annotation.Root({
  ...MessagesAnnotation.spec,
  next: Annotation<string>({ reducer: (_, y) => y, default: () => "" }),
});

const routeSchema = z.object({
  destination: z.enum(["product_catalog", "orders", "customers", "end"]),
});

const routerModel = new ChatDeepSeek({
  model: MODELS.router,
  temperature: 0,
}).withStructuredOutput(routeSchema);

const router = async (state: typeof State.State) => {
  // El router solo ve mensajes human/ai con texto — sin tool calls ni tool results
  const visibleMessages = state.messages.filter((m: any) => {
    const type = m._getType?.() ?? m.role;
    if (type === "tool") return false;
    if (type === "ai" && m.tool_calls?.length) return false;
    if (type === "ai" && !m.content) return false;
    return true;
  });

  const result = await routerModel.invoke([
    new SystemMessage(systemPromptRouter),
    ...visibleMessages,
  ]);

  console.log(`[Router] → destination="${result.destination}"`);
  return { next: result.destination };
};

const fallback = () => ({
  messages: [new AIMessage(WELCOME_MESSAGE)],
});

const graph = new StateGraph(State)
  .addNode("router", router)
  .addNode("product_catalog", productCatalogGraph)
  .addNode("orders", ordersGraph)
  .addNode("customers", customersGraph)
  .addNode("fallback", fallback)
  .addEdge(START, "router")
  .addConditionalEdges("router", (state) => {
    if (state.next === "product_catalog") return "product_catalog";
    if (state.next === "orders") return "orders";
    if (state.next === "customers") return "customers";
    return "fallback";
  })
  .addEdge("product_catalog", END)
  .addEdge("orders", END)
  .addEdge("customers", END)
  .addEdge("fallback", END)
  .compile({ checkpointer: new MemorySaver() });

export { graph };
