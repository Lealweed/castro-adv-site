// src/lib/evolutionBackend.ts
// Backend-only Evolution API integration (server-side, nunca expor no frontend)
import { env } from '@/env';
import { normalizePhoneE164 } from './phoneE164';

export async function sendEvolutionMessage({
  phone,
  text,
  template,
  variables,
}: {
  phone: string;
  text: string;
  template?: string | null;
  variables?: Record<string, any>;
}): Promise<{ providerMessageId: string }> {
  const apiUrl = process.env.EVOLUTION_API_URL || env.apiBaseUrl + '/evolution';
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    throw new Error('Evolution API config missing (backend)');
  }

  const formattedPhone = normalizePhoneE164(phone);
  const endpoint = `${apiUrl}/message/sendText/${instance}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: formattedPhone,
      text,
      template,
      variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolution API Error: ${response.status} - ${errorText}`);
  }
  const data = await response.json().catch(() => ({}));
  return { providerMessageId: data?.messageId || '' };
}
