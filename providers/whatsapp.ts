import type makeWASocket from "baileys";

type WASock = ReturnType<typeof makeWASocket>;

let _sock: WASock | null = null;

export function setSock(sock: WASock): void {
  _sock = sock;
}

export async function sendAdminNotification(message: string, adminJid: string): Promise<void> {
  if (!_sock) return;
  await _sock.sendMessage(adminJid, { text: message });
}
