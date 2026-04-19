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
import { lastMessages } from "../../utils/format";
import { RETURN_DIRECT_TOOLS } from "../tools.config";
import { KNOWN_BRANDS } from "./constants";

const basePrompt = readFileSync(
  new URL("./prompts/catalog-agent.xml", import.meta.url),
  "utf8",
);

const systemPrompt = basePrompt.replace(
  "{{KNOWN_BRANDS}}",
  KNOWN_BRANDS.join(", "),
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
    ...lastMessages(state.messages),
  ]);
  return { messages: [result] };
};

const toolNode = new ToolNode(tools);

const productCatalogGraph = new StateGraph(State)
  .addNode("agent", catalogAgent)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition)
  .addConditionalEdges("tools", (state) => {
    const last = state.messages.at(-1) as any;
    if ((RETURN_DIRECT_TOOLS as readonly string[]).includes(last?.name)) return END;
    return "agent";
  })
  .compile();

export { productCatalogGraph };
