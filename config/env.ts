import "dotenv/config";

export const env = {
  BACKEND_URL:
    process.env.ENVIRONMENT === "testing"
      ? process.env.BACKEND_URL_TESTING
      : process.env.BACKEND_URL || "",
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
  TARGET_JID: process.env.TARGET_JID || "",
  MESSAGE: process.env.MESSAGE || "",
  BEARER_TOKEN: process.env.BEARER_TOKEN || "",
  BOT_NUMBER: process.env.BOT_NUMBER || "",
  ADMIN_NUMBER: process.env.ADMIN_NUMBER || "",
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "",
};
