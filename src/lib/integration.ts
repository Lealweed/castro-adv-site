// src/lib/integration.ts
// Funções para integração WhatsApp: gravação de mensagens, outbox, eventos
import { requireSupabase } from './supabaseDb';

export async function upsertWhatsappConversation({ officeId, clientId, phoneE164 }: { officeId: string, clientId?: string | null, phoneE164: string }) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('whatsapp_conversations')
    .upsert({ office_id: officeId, client_id: clientId, phone_e164: phoneE164 }, { onConflict: 'office_id,phone_e164', returning: 'representation' })
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function insertWhatsappMessage({
  officeId,
  clientId,
  conversationId,
  direction,
  providerMessageId,
  fromNumber,
  toNumber,
  textBody,
  status,
  rawPayload,
}: {
  officeId: string,
  clientId?: string | null,
  conversationId: string,
  direction: 'inbound' | 'outbound',
  providerMessageId?: string,
  fromNumber: string,
  toNumber: string,
  textBody?: string,
  status?: string,
  rawPayload?: any,
}) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('whatsapp_messages')
    .insert({
      office_id: officeId,
      client_id: clientId,
      conversation_id: conversationId,
      direction,
      provider_message_id: providerMessageId,
      from_number: fromNumber,
      to_number: toNumber,
      text_body: textBody,
      status: status || 'sent',
      raw_payload: rawPayload || null,
    })
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function insertIntegrationOutbox({
  officeId,
  channel,
  eventType,
  destination,
  payload,
  status,
  idempotencyKey,
}: {
  officeId?: string | null,
  channel: string,
  eventType: string,
  destination?: string | null,
  payload: any,
  status?: string,
  idempotencyKey?: string,
}) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('integration_outbox')
    .insert({
      office_id: officeId,
      channel,
      event_type: eventType,
      destination,
      payload,
      status: status || 'pending',
      idempotency_key: idempotencyKey,
    })
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
