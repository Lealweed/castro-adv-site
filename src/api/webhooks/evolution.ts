// src/api/webhooks/evolution.ts
// Handler para webhook inbound Evolution
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireSupabase } from '@/lib/supabaseDb';
import { normalizePhoneE164 } from '@/lib/phoneE164';
import { upsertWhatsappConversation, insertWhatsappMessage, insertIntegrationOutbox } from '@/lib/integration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = requireSupabase();
    // Validar token de origem (exemplo: X-Evolution-Token)
    const token = req.headers['x-evolution-token'];
    if (!token || token !== process.env.EVOLUTION_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Logar webhook
    await sb.from('integration_webhook_logs').insert({
      provider: 'evolution',
      event_type: req.body?.event || null,
      headers: req.headers,
      payload: req.body,
    });

    // Extrair dados principais
    const { from, to, text, mediaUrl, event, instance, messageId, timestamp } = req.body || {};
    if (!from || !to) return res.status(400).json({ error: 'Payload inválido' });

    // Normalizar números
    const fromE164 = normalizePhoneE164(from);
    const toE164 = normalizePhoneE164(to);

    // Identificar escritório (exemplo: pelo número do escritório ou instance)
    // Aqui, buscar office_id pelo número ou instance (ajustar conforme modelo real)
    let officeId: string | null = null;
    if (instance) {
      const { data: office, error } = await sb.from('offices').select('id').eq('evolution_instance', instance).maybeSingle();
      if (!error && office) officeId = office.id;
    }
    if (!officeId) {
      // fallback: buscar pelo número do escritório
      const { data: office, error } = await sb.from('offices').select('id').eq('whatsapp_number', toE164).maybeSingle();
      if (!error && office) officeId = office.id;
    }
    if (!officeId) return res.status(400).json({ error: 'Escritório não identificado' });

    // Buscar cliente por número
    let clientId: string | null = null;
    const { data: client, error: clientErr } = await sb.from('clients').select('id').eq('whatsapp', fromE164).maybeSingle();
    if (!clientErr && client) clientId = client.id;

    // Upsert conversa
    const conversation = await upsertWhatsappConversation({ officeId, clientId, phoneE164: fromE164 });

    // Gravar mensagem inbound
    const message = await insertWhatsappMessage({
      officeId,
      clientId,
      conversationId: conversation.id,
      direction: 'inbound',
      providerMessageId: messageId,
      fromNumber: fromE164,
      toNumber: toE164,
      textBody: text,
      status: 'received',
      rawPayload: req.body,
    });

    // Gerar evento de integração
    await sb.from('integration_events').insert({
      office_id: officeId,
      event_type: 'whatsapp.message.received',
      entity_type: 'whatsapp_message',
      entity_id: message.id,
      payload: req.body,
    });

    return res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro no webhook.' });
  }
}
