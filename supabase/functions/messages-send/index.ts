// Edge Function: messages-send
// Endurecimento profissional para integração WhatsApp/Evolution
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`
  }
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    return cleaned
  }
  return cleaned
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function validateJwt(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { status: 401, error: 'unauthorized' };
  }
  const token = authHeader.replace('Bearer ', '');
  const N8N_SECRET = Deno.env.get('N8N_MESSAGES_SEND_SECRET');
  if (N8N_SECRET && token === N8N_SECRET) {
    return { n8n: true };
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    throw { status: 401, error: 'unauthorized' }
  }
  return data.user
}

async function validateMembership(user_id: string, office_id: string) {
  const { data, error } = await supabase
    .from('office_members')
    .select('id')
    .eq('user_id', user_id)
    .eq('office_id', office_id)
    .maybeSingle()
  return !!data && !error
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405)
    const body = await req.json()
    const { office_id, to_number, message, idempotencyKey } = body
    if (!office_id || !to_number || !message) return jsonResponse({ ok: false, error: 'missing_fields' }, 400)
    const authResult = await validateJwt(req)
    const isN8n = 'n8n' in authResult && authResult.n8n === true
    if (!isN8n) {
      const isMember = await validateMembership(authResult.id, office_id)
      if (!isMember) return jsonResponse({ ok: false, error: 'forbidden' }, 403)
    }
    // Idempotência: checar se já existe outbox com idempotencyKey
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('integration_outbox')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (existing) return jsonResponse({ ok: true, duplicate: true, outboxId: existing.id })
    }
    // Normalizar número
    const normalizedTo = normalizePhone(to_number)
    // Buscar from_number padrão do escritório
    let from_number = ''
    const { data: office } = await supabase
      .from('offices')
      .select('whatsapp_number')
      .eq('id', office_id)
      .maybeSingle()
    if (office?.whatsapp_number) from_number = normalizePhone(office.whatsapp_number)
    // Chamar Evolution API
    let evolutionResp, evolutionData
    try {
      evolutionResp = await fetch(`${evolutionApiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${evolutionApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: normalizedTo,
          message,
          from: from_number,
        }),
      })
      evolutionData = await evolutionResp.json()
    } catch (err) {
      return jsonResponse({ ok: false, error: 'evolution_network_error' }, 502)
    }
    if (!evolutionResp.ok) {
      return jsonResponse({ ok: false, error: 'evolution_error', details: evolutionData }, 502)
    }
    // Salvar mensagem e outbox
    const { data: msg, error: msgErr } = await supabase.from('whatsapp_messages').insert({
      office_id,
      to_number: normalizedTo,
      from_number,
      message,
      direction: 'outbound',
      provider: 'evolution',
      provider_message_id: evolutionData?.id || null,
      status: 'sent',
      created_by: isN8n ? null : authResult.id,
    }).select().maybeSingle()
    if (msgErr) return jsonResponse({ ok: false, error: 'db_error' }, 500)
    const { data: outbox, error: outboxErr } = await supabase.from('integration_outbox').insert({
      office_id,
      channel: 'whatsapp',
      direction: 'outbound',
      provider: 'evolution',
      provider_message_id: evolutionData?.id || null,
      to_number: normalizedTo,
      from_number,
      message,
      status: 'sent',
      idempotency_key: idempotencyKey || null,
      created_by: isN8n ? null : authResult.id,
    }).select().maybeSingle()
    if (outboxErr) return jsonResponse({ ok: false, error: 'db_error' }, 500)
    return jsonResponse({ ok: true, messageId: msg.id, outboxId: outbox.id })
  } catch (err) {
    return jsonResponse({ ok: false, error: 'internal_error' }, 500)
  }
})
