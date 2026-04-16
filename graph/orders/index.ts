import {
  StateSchema,
  MessagesValue,
  GraphNode,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { MODELS } from "../../config/models";
import { SystemMessage } from "@langchain/core/messages";
import { readFileSync } from "node:fs";
import { searchProductsTool } from "./tools/search-products.tool";
import { addToOrderTool } from "./tools/add-to-order.tool";
import { removeFromOrderTool } from "./tools/remove-from-order.tool";
import { viewOrderTool } from "./tools/view-order.tool";
import { confirmOrderTool } from "./tools/confirm-order.tool";
import { getClientTool } from "./tools/get-client.tool";

const systemPrompt = readFileSync(
  new URL("./prompts/orders-agent.xml", import.meta.url),
  "utf8",
);

const State = new StateSchema({
  messages: MessagesValue,
});

const tools = [
  searchProductsTool,
  addToOrderTool,
  removeFromOrderTool,
  viewOrderTool,
  confirmOrderTool,
  getClientTool,
];

const model = new ChatDeepSeek({
  model: MODELS.agent,
  temperature: 0,
}).bindTools(tools);

const ordersAgent: GraphNode<typeof State> = async (state) => {
  const result = await model.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages,
  ]);
  return { messages: [result] };
};

const toolNode = new ToolNode(tools);

const ordersWorkflow = new StateGraph(State)
  .addNode("agent", ordersAgent)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition)
  .addEdge("tools", "agent");

const ordersGraph = ordersWorkflow.compile();

export { ordersGraph, ordersWorkflow };
