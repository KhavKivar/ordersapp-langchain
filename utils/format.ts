export const toCapitalized = (value: string) =>
  value ? value[0].toUpperCase() + value.slice(1) : "";

export const lastMessages = (messages: any[], n = 10): any[] => {
  const sliced = messages.slice(-n);
  let start = 0;
  while (start < sliced.length) {
    const msg = sliced[start];
    const type = msg._getType?.() ?? msg.type;
    const toolCalls = msg.tool_calls ?? msg.kwargs?.tool_calls ?? msg.additional_kwargs?.tool_calls;
    if (type === "tool" || (type === "ai" && toolCalls?.length)) {
      start++;
    } else {
      break;
    }
  }
  return sliced.slice(start);
};
