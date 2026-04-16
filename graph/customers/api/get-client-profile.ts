import { api } from "../../../axios/instance";

export interface ClientProfile {
  id: number;
  localName: string;
  address: string;
}

const TTL_MS = 60 * 60 * 1000; // 1 hora
const cache = new Map<string, { data: ClientProfile; expiresAt: number }>();

export function clearClientProfileCache(phone: string): void {
  cache.delete(phone);
}

export default async function getClientProfile(phone: string): Promise<ClientProfile | null> {
  const cached = cache.get(phone);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  try {
    const response = await api.get(`/clients/phone/${phone}`);
    const { client } = response.data;
    const profile = { id: client.id, localName: client.localName, address: client.address };
    cache.set(phone, { data: profile, expiresAt: Date.now() + TTL_MS });
    return profile;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}
