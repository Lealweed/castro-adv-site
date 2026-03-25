// src/lib/phoneE164.ts
// Utilitário central para normalização de telefone E.164

/**
 * Normaliza um telefone para padrão E.164 (Brasil)
 * Exemplo: (11) 99999-9999 -> 5511999999999
 */
export function normalizePhoneE164(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    return cleaned;
  }
  // fallback: retorna só números
  return cleaned;
}
