// Edge Function: messages-send
// Endurecimento profissional para integração WhatsApp/Evolution API
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const evolutionApiUrl = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/+$/, '')
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY') || ''
const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'Castrodeoliveiraadv'

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
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { status: 401, error: 'unauthorized' }
  }
  const token = authHeader.replace('Bearer ', '').trim()
  const n8nSecret = Deno.env.get('N8N_MESSAGES_SEND_SECRET') || Deno.env.get('N8N_WEBHOOK_SECRET')
  if (n8nSecret && token === n8nSecret) {
    return { n8n: true, id: null }
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    throw { status: 401, error: 'unauthorized' }
  }
  return { n8n: false, id: data.user.id }
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
    const { office_id, to_number, message, idempotencyKey, instance } = body
    if (!office_id || !to_number || !message) return jsonResponse({ ok: false, error: 'missing_fields' }, 400)

    const authResult = await validateJwt(req)
    if (!authResult.n8n && authResult.id) {
      const isMember = await validateMembership(authResult.id, office_id)
      if (!isMember) return jsonResponse({ ok: false, error: 'forbidden' }, 403)
    }

    // Idempotência: checar se já existe outbox com idempotency_key
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('integration_outbox')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (existing) return jsonResponse({ ok: true, duplicate: true, outboxId: existing.id })
    }

    const normalizedTo = normalizePhone(to_number)
    const targetInstance = instance || evolutionInstance

    // Chamar Evolution API (endpoint oficial sendText)
    let evolutionResp: Response
    let evolutionData: any
    try {
      evolutionResp = await fetch(`${evolutionApiUrl}/message/sendText/${targetInstance}`, {
        method: 'POST',
        headers: {
          apikey: evolutionApiKey,
          Authorization: `Bearer ${evolutionApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: normalizedTo,
          text: message,
        }),
      })
      evolutionData = await evolutionResp.json().catch(() => ({}))
    } catch {
      return jsonResponse({ ok: false, error: 'evolution_network_error' }, 502)
    }

    if (!evolutionResp.ok) {
      return jsonResponse({ ok: false, error: 'evolution_error', details: evolutionData }, 502)
    }

    const providerMsgId = evolutionData?.key?.id || evolutionData?.messageId || evolutionData?.id || null

    // Registrar no integration_outbox conforme schema patch_integration_whatsapp_final.sql
    const { data: outbox, error: outboxErr } = await supabase
      .from('integration_outbox')
      .insert({
        office_id,
        channel: 'whatsapp',
        event_type: 'whatsapp_message_sent',
        destination: normalizedTo,
        payload: {
          to_number: normalizedTo,
          message,
          provider: 'evolution',
          provider_message_id: providerMsgId,
          sent_by: authResult.id,
        },
        status: 'sent',
        sent_at: new Date().toISOString(),
        idempotency_key: idempotencyKey || null,
      })
      .select('id')
      .maybeSingle()

    if (outboxErr) {
      return jsonResponse({ ok: true, providerMessageId: providerMsgId, warning: outboxErr.message })
    }

    return jsonResponse({ ok: true, providerMessageId: providerMsgId, outboxId: outbox?.id || null })
  } catch (err: any) {
    if (err?.status === 401) return jsonResponse({ ok: false, error: 'unauthorized' }, 401)
    return jsonResponse({ ok: false, error: 'internal_error' }, 500)
  }
})
