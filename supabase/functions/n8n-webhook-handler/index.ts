// Edge Function: n8n-webhook-handler
// Endurecimento profissional para integração n8n
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const n8nSecret = Deno.env.get('N8N_WEBHOOK_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isValidUUID(uuid: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405)
    // Autenticação via secret
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${n8nSecret}`) return jsonResponse({ ok: false, error: 'unauthorized' }, 401)
    let body
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ ok: false, error: 'invalid_json' }, 400)
    }
    const { event_type, office_id, entity_id, payload, idempotency_key } = body
    if (!event_type || typeof event_type !== 'string') return jsonResponse({ ok: false, error: 'invalid_event_type' }, 400)
    if (!office_id || !isValidUUID(office_id)) return jsonResponse({ ok: false, error: 'invalid_office_id' }, 400)
    if (entity_id && !isValidUUID(entity_id)) return jsonResponse({ ok: false, error: 'invalid_entity_id' }, 400)
    if (!payload || typeof payload !== 'object') return jsonResponse({ ok: false, error: 'invalid_payload' }, 400)
    // Idempotência mínima
    if (idempotency_key) {
      const { data: existing } = await supabase
        .from('integration_webhook_logs')
        .select('id')
        .eq('idempotency_key', idempotency_key)
        .maybeSingle()
      if (existing) return jsonResponse({ ok: true, duplicate: true, eventId: existing.id })
    }
    // Registrar log
    const { data: log, error: logErr } = await supabase.from('integration_webhook_logs').insert({
      provider: 'n8n',
      event_type,
      office_id,
      entity_id: entity_id || null,
      payload,
      raw_payload: JSON.stringify(body),
      headers: JSON.stringify({ authorization: auth }),
      idempotency_key: idempotency_key || null,
      status: 'received',
    }).select().maybeSingle()
    if (logErr) return jsonResponse({ ok: false, error: 'db_error', details: logErr.message }, 500)
    return jsonResponse({ ok: true, eventId: log.id })
  } catch (err) {
    // Não retornar erro cru
    return jsonResponse({ ok: false, error: 'internal_error' }, 500)
  }
})
