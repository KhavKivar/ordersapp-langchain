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
import { createClientTool } from "./tools/create-client.tool";
import { readFileSync } from "node:fs";

const systemPrompt = readFileSync(
  new URL("./prompts/customers-agent.xml", import.meta.url),
  "utf8",
);

const State = new StateSchema({
  messages: MessagesValue,
});

const tools = [createClientTool];

const model = new ChatDeepSeek({
  model: MODELS.agent,
  temperature: 0,
}).bindTools(tools);

const customersAgent: GraphNode<typeof State> = async (state) => {
  const result = await model.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages,
  ]);
  return { messages: [result] };
};

const toolNode = new ToolNode(tools);

const customersGraph = new StateGraph(State)
  .addNode("agent", customersAgent)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition)
  .addEdge("tools", END)
  .compile();

export { customersGraph };
