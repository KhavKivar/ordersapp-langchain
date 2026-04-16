import "dotenv/config";
import { startWhatsApp } from "./client";

void startWhatsApp().catch((error) => {
  console.error("failed to start WhatsApp client", error);
});
