import makeWASocket, {
  Browsers,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  DisconnectReason,
} from "baileys";
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { env } from "./config/env";
import { graph } from "./graph/index";
import { setSock } from "./providers/whatsapp";
import qrcode from "qrcode-terminal";

const LOG_FILE = "trace.log";

function writeTrace(data: object) {
  const content = JSON.stringify(data, null, 2);
  writeFileSync(LOG_FILE, content, "utf8");
}

// Queue por thread_id para evitar race conditions con el checkpointer
const messageQueues = new Map<string, Promise<void>>();

function enqueue(threadId: string, task: () => Promise<void>): void {
  const prev = messageQueues.get(threadId) ?? Promise.resolve();
  const next = prev.then(task).catch(() => {});
  messageQueues.set(threadId, next);
}

async function runAI(
  text: string,
  threadId: string,
  phone: string,
  phoneId: string,
): Promise<string> {
  const result = await graph.invoke(
    { messages: [{ role: "user", content: text }] },
    { configurable: { thread_id: threadId, phone, phoneId } },
  );

  writeTrace({
    timestamp: new Date().toISOString(),
    threadId,
    phone,
    input: text,
    messages: result.messages.map((m: any) => ({
      role: m._getType?.() ?? m.role ?? "unknown",
      content: m.content,
      tool_calls: m.tool_calls?.length ? m.tool_calls : undefined,
    })),
  });

  const content = result.messages.at(-1)?.content ?? "";
  return typeof content === "string"
    ? content
    : content.map((c) => ("text" in c ? c.text : "")).join("");
}

export async function startWhatsApp(reconnectAttempt = 0): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();

  console.log(
    `[Attempt ${reconnectAttempt}] Using WA version ${version.join(".")}`,
  );

  const sock = makeWASocket({
    version,
    browser: Browsers.ubuntu("Chrome"),
    auth: state,
    printQRInTerminal: false,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
  });
  setSock(sock);

  sock.ev.on("creds.update", saveCreds);

  if (env.BOT_NUMBER && !state.creds.registered) {
    const phone = env.BOT_NUMBER.replace(/\D/g, "");
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phone);
        console.log(`\n🚀 CÓDIGO DE VINCULACIÓN: ${code}`);
        console.log(
          `→ Abre WhatsApp > Dispositivos vinculados > Vincular con número de teléfono\n`,
        );
      } catch (err: any) {
        console.error("Error requesting pairing code:", err?.message || err);
      }
    }, 3000);
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("Scan QR (fallback):");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ ¡Conectado exitosamente a WhatsApp!");
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isConflict = statusCode === DisconnectReason.connectionReplaced;

      console.log(
        `Conexión cerrada (código ${statusCode}). LoggedOut: ${isLoggedOut}, Conflict: ${isConflict}`,
      );

      if (isLoggedOut) {
        console.log(
          "❌ Sesión cerrada. Borrá la carpeta 'auth' y volvé a intentarlo.",
        );
      } else if (isConflict) {
        // Otra sesión tomó el control — esperamos más tiempo antes de reconectar
        const delay = 15_000;
        console.log(`⚠️ Sesión reemplazada (440). Esperando ${delay / 1000}s antes de reconectar...`);
        setTimeout(() => startWhatsApp(0), delay);
      } else if (reconnectAttempt < 5) {
        const delay = Math.min(5000 * (reconnectAttempt + 1), 30000);
        console.log(`Esperando ${delay / 1000}s antes de reconectar...`);
        setTimeout(() => startWhatsApp(reconnectAttempt + 1), delay);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    console.log(
      `📩 Nuevo mensaje de ${msg.key.remoteJid}:${msg.key.remoteJidAlt}`,
    );
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || remoteJid.endsWith("@g.us")) return;

    const remoteJidAlt = msg.key.remoteJidAlt ?? remoteJid;
    const phoneId = remoteJidAlt;
    const phone = remoteJidAlt.split("@")[0];
    const threadId = remoteJidAlt;

    const text =
      msg.message.conversation ?? msg.message.extendedTextMessage?.text ?? "";
    if (!text.trim()) return;

    enqueue(threadId, async () => {
      try {
        await sock.sendPresenceUpdate("composing", remoteJid);
        const response = await runAI(text, threadId, phone, phoneId);
        await sock.sendPresenceUpdate("paused", remoteJid);
        await sock.sendMessage(remoteJid, { text: response });
      } catch (error: any) {
        console.error(`Error procesando mensaje de ${remoteJid}:`, error?.message ?? error);
        await sock.sendMessage(remoteJid, { text: "Ocurrió un error. Intenta de nuevo." });
      }
    });
  });
}
