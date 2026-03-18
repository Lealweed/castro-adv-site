/**
 * Evolution API WhatsApp Service
 * Handles all WhatsApp messaging through Evolution API
 */

/**
 * Formats a phone number for WhatsApp
 * - Removes all non-numeric characters
 * - If it's a Brazilian number, adds "55" prefix
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it's a Brazilian number (10 or 11 digits), add 55 prefix
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  return cleaned;
}

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

  const formattedPhone = formatPhoneNumber(phone);
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
