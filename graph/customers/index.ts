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
import { getClientProfileTool } from "./tools/get-client-profile.tool";
import { updateClientTool } from "./tools/update-client.tool";
import { readFileSync } from "node:fs";
import { lastMessages } from "../../utils/format";

const systemPrompt = readFileSync(
  new URL("./prompts/customers-agent.xml", import.meta.url),
  "utf8",
);

const State = new StateSchema({
  messages: MessagesValue,
});

const tools = [getClientProfileTool, createClientTool, updateClientTool];

const model = new ChatDeepSeek({
  model: MODELS.agent,
  temperature: 0,
}).bindTools(tools);

const customersAgent: GraphNode<typeof State> = async (state) => {
  const result = await model.invoke([
    new SystemMessage(systemPrompt),
    ...lastMessages(state.messages),
  ]);
  return { messages: [result] };
};

const toolNode = new ToolNode(tools);

const customersGraph = new StateGraph(State)
  .addNode("agent", customersAgent)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition)
  .addEdge("tools", "agent")
  .compile();

export { customersGraph };
