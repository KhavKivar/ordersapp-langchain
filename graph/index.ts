import {
  MessagesAnnotation,
  StateGraph,
  START,
  END,
  MemorySaver,
} from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { MODELS } from "../config/models";
import { env } from "../config/env";
import { lastMessages } from "../utils/format";
import { RETURN_DIRECT_TOOLS } from "./tools.config";
import { KNOWN_BRANDS } from "./product-catalog/constants";

import { listProductsTool } from "./product-catalog/tools/list-products.tool";
import { searchProductsTool } from "./product-catalog/tools/search-products.tool";
import { addToOrderTool } from "./orders/tools/add-to-order.tool";
import { removeFromOrderTool } from "./orders/tools/remove-from-order.tool";
import { reduceOrderQuantityTool } from "./orders/tools/reduce-order-quantity.tool";
import { viewOrderTool } from "./orders/tools/view-order.tool";
import { confirmOrderTool } from "./orders/tools/confirm-order.tool";
import { getClientTool } from "./orders/tools/get-client.tool";
import { getClientOrdersTool } from "./orders/tools/get-client-orders.tool";
import { getOrderDetailTool } from "./orders/tools/get-order-detail.tool";
import { getClientProfileTool } from "./customers/tools/get-client-profile.tool";
import { createClientTool } from "./customers/tools/create-client.tool";
import { updateClientTool } from "./customers/tools/update-client.tool";

const basePrompt = readFileSync(
  new URL("./prompts/agent.xml", import.meta.url),
  "utf8",
);

const systemPrompt = basePrompt.replace("{{KNOWN_BRANDS}}", KNOWN_BRANDS.join(", "));

const tools = [
  listProductsTool,
  searchProductsTool,
  addToOrderTool,
  removeFromOrderTool,
  reduceOrderQuantityTool,
  viewOrderTool,
  confirmOrderTool,
  getClientTool,
  getClientOrdersTool,
  getOrderDetailTool,
  getClientProfileTool,
  createClientTool,
  updateClientTool,
];

const model = new ChatDeepSeek({
  model: MODELS.agent,
  temperature: 0,
}).bindTools(tools);

const agent = async (state: typeof MessagesAnnotation.State) => {
  const result = await model.invoke([
    new SystemMessage(systemPrompt),
    ...lastMessages(state.messages),
  ]);
  return { messages: [result] };
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agent)
  .addNode("tools", new ToolNode(tools))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition)
  .addConditionalEdges("tools", (state) => {
    const last = state.messages.at(-1) as any;
    if ((RETURN_DIRECT_TOOLS as readonly string[]).includes(last?.name)) return END;
    return "agent";
  })
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
