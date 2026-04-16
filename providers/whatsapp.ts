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

export async function sendContactToAdmin(
  adminJid: string,
  phone: string,
  displayName: string
): Promise<void> {
  if (!_sock) return;

  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${displayName}`,
    `TEL;type=CELL;type=VOICE;waid=${phone}:+${phone}`,
    "END:VCARD",
  ].join("\n");

  await _sock.sendMessage(adminJid, {
    contacts: {
      displayName,
      contacts: [{ vcard }],
    },
  });
}
