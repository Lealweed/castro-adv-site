/**
 * Evolution API WhatsApp Service
 * Handles all WhatsApp messaging through Evolution API
 */


import { normalizePhoneE164 } from './phoneE164';

/**
 * Sends a text message via WhatsApp using Evolution API
 * @param phone - Phone number in any format
 * @param text - Message text to send
 * @throws Error if the API call fails
 */
export async function sendWhatsAppText(phone: string, text: string): Promise<void> {
  // @ts-ignore - Vite env types
  const apiUrl = import.meta.env.VITE_EVOLUTION_API_URL as string | undefined;
  // @ts-ignore - Vite env types
  const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY as string | undefined;
  // @ts-ignore - Vite env types
  const instance = import.meta.env.VITE_EVOLUTION_INSTANCE as string | undefined;

  if (!apiUrl || !apiKey || !instance) {
    throw new Error('Evolution API configuration is missing. Please check environment variables.');
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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolution API Error: ${response.status} - ${errorText}`);
  }
}
