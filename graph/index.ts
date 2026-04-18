import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
  START,
  END,
  MemorySaver,
} from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { productCatalogGraph } from "./product-catalog/index";
import { ordersGraph } from "./orders/index";
import { customersGraph } from "./customers/index";
import getClientProfile from "./customers/api/get-client-profile";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { MODELS } from "../config/models";
import { env } from "../config/env";
import { lastMessages } from "../utils/format";
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
  const visibleMessages = lastMessages(state.messages, 15).filter((m: any) => {
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

const fallback = async (_state: typeof State.State, config: any) => {
  const phone = config?.configurable?.phone;
  const profile = phone ? await getClientProfile(phone) : null;

  if (profile) {
    return {
      messages: [new AIMessage(
        `¡Hola, *${profile.localName}*! 👋\n\nSoy tu asistente de *Vasvani Shop*. ¿En qué te puedo ayudar?\n\n📋 *Ver productos y precios*\n🛍️ *Hacer un pedido*\n📦 *Ver mis pedidos*\n👤 *Ver o modificar mis datos*`,
      )],
    };
  }

  return {
    messages: [new AIMessage(
      `¡Hola! 👋 Bienvenido a *Vasvani Shop*.\n\nTodavía no tenés una cuenta registrada. Para poder hacer pedidos, te recomendamos registrarte primero.\n\n→ Escribí *"quiero registrarme"* para crear tu cuenta.`,
    )],
  };
};

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

// Chat mode — ejecutar directamente: npx tsx graph/index.ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const THREAD_ID = env.TEST_NUMBER;
  const phone = THREAD_ID.split("@")[0];
  const config = { configurable: { thread_id: THREAD_ID, phone, phoneId: THREAD_ID } };

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n🤖 Chat iniciado — thread_id:", THREAD_ID);
  console.log('Escribí tu mensaje (o "exit" para salir)\n');

  const ask = () => {
    rl.question("Vos: ", async (input) => {
      const text = input.trim();
      if (!text || text === "exit") {
        rl.close();
        return;
      }

      try {
        const result = await graph.invoke(
          { messages: [new HumanMessage(text)] },
          config,
        );

        const last = result.messages.at(-1);
        const content =
          typeof last?.content === "string"
            ? last.content
            : JSON.stringify(last?.content);

        console.log("\nBot:", content, "\n");
      } catch (err) {
        console.error("[Error]", err);
      }

      ask();
    });
  };

  ask();
}
