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
import { listProductsTool } from "./tools/list-products.tool";
import { searchProductsTool } from "./tools/search-products.tool";
import { readFileSync } from "node:fs";

const systemPrompt = readFileSync(
  new URL("./prompts/catalog-agent.xml", import.meta.url),
  "utf8",
);

const State = new StateSchema({
  messages: MessagesValue,
});

const tools = [listProductsTool, searchProductsTool];

const model = new ChatDeepSeek({
  model: MODELS.agent,
  temperature: 0,
}).bindTools(tools);

const catalogAgent: GraphNode<typeof State> = async (state) => {
  const result = await model.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages,
  ]);
  return { messages: [result] };
};

const toolNode = new ToolNode(tools);

const productCatalogGraph = new StateGraph(State)
  .addNode("agent", catalogAgent)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition)
  .addEdge("tools", "agent")
  .compile();

export { productCatalogGraph };
