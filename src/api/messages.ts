// src/api/messages.ts
// Endpoint handler para envio seguro de mensagens WhatsApp via Evolution API
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';


import { sendEvolutionMessage } from '@/lib/evolutionBackend';
import { upsertWhatsappConversation, insertWhatsappMessage, insertIntegrationOutbox } from '@/lib/integration';
import { normalizePhoneE164 } from '@/lib/phoneE164';
import { requireSupabase } from '@/lib/supabaseDb';

const SendMessageSchema = z.object({
  officeId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  channel: z.literal('whatsapp'),
  text: z.string().min(1),
  template: z.string().nullable().optional(),
  variables: z.record(z.any()).optional(),
  idempotencyKey: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = SendMessageSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }
  const { officeId, clientId, channel, text, template, variables, idempotencyKey } = parse.data;


  try {
    const sb = requireSupabase();
    // Buscar cliente
    let client = null;
    if (clientId) {
      const { data, error } = await sb.from('clients').select('id,whatsapp').eq('id', clientId).maybeSingle();
      if (error) throw new Error(error.message);
      client = data;
    }
    // Normalizar telefone
    const phoneE164 = normalizePhoneE164(client?.whatsapp || '');
    if (!phoneE164) throw new Error('Telefone do cliente não encontrado ou inválido.');

    // Upsert conversa
    const conversation = await upsertWhatsappConversation({ officeId, clientId, phoneE164 });

    // Enviar via Evolution API (backend seguro)
    const evolutionResp = await sendEvolutionMessage({ phone: phoneE164, text, template, variables });

    // Gravar mensagem
    const message = await insertWhatsappMessage({
      officeId,
      clientId,
      conversationId: conversation.id,
      direction: 'outbound',
      providerMessageId: evolutionResp.providerMessageId,
      fromNumber: '', // preencher com número do escritório se disponível
      toNumber: phoneE164,
      textBody: text,
      status: 'sent',
      rawPayload: evolutionResp,
    });

    // Gravar outbox
    await insertIntegrationOutbox({
      officeId,
      channel: 'whatsapp',
      eventType: 'whatsapp.message.sent',
      destination: phoneE164,
      payload: { messageId: message.id, conversationId: conversation.id, text },
      status: 'sent',
      idempotencyKey,
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Mensagem enviada',
      messageId: message.id,
      conversationId: conversation.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao enviar mensagem.' });
  }
}
