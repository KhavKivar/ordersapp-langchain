export const toCapitalized = (value: string) =>
  value ? value[0].toUpperCase() + value.slice(1) : "";

export const lastMessages = (messages: any[], n = 10) => messages.slice(-n);
