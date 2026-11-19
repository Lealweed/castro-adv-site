// Edge Function: n8n-webhook-handler
// Recebe eventos de automação do n8n, registra log idempotente e processa notificações/eventos no CRM
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const n8nSecret = Deno.env.get('N8N_WEBHOOK_SECRET') || ''

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

    const auth = req.headers.get('authorization') || ''
    if (n8nSecret && auth !== `Bearer ${n8nSecret}`) {
      return jsonResponse({ ok: false, error: 'unauthorized' }, 401)
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ ok: false, error: 'invalid_json' }, 400)
    }

    const { event_type, office_id, entity_id, payload, idempotency_key, title, message } = body
    if (!event_type || typeof event_type !== 'string') {
      return jsonResponse({ ok: false, error: 'invalid_event_type' }, 400)
    }
    if (office_id && !isValidUUID(office_id)) {
      return jsonResponse({ ok: false, error: 'invalid_office_id' }, 400)
    }
    if (entity_id && !isValidUUID(entity_id)) {
      return jsonResponse({ ok: false, error: 'invalid_entity_id' }, 400)
    }

    // 1) Verificação de Idempotência
    if (idempotency_key) {
      const { data: existing } = await supabase
        .from('integration_webhook_logs')
        .select('id')
        .eq('idempotency_key', idempotency_key)
        .maybeSingle()
      if (existing) return jsonResponse({ ok: true, duplicate: true, eventId: existing.id })
    }

    // 2) Registra log em integration_webhook_logs (conforme colunas de patch_integration_whatsapp_final.sql)
    const { data: log, error: logErr } = await supabase
      .from('integration_webhook_logs')
      .insert({
        provider: 'n8n',
        event_type,
        headers: { user_agent: req.headers.get('user-agent') || 'n8n' },
        payload: { office_id: office_id || null, entity_id: entity_id || null, ...(payload || body) },
        response_status: 200,
        idempotency_key: idempotency_key || null,
      })
      .select('id')
      .maybeSingle()

    if (logErr) return jsonResponse({ ok: false, error: 'db_error', details: logErr.message }, 500)

    // 3) Registra evento de integração em integration_events
    await supabase.from('integration_events').insert({
      office_id: office_id || null,
      event_type,
      entity_id: entity_id || null,
      payload: payload || body || {},
      processed: true,
      processed_at: new Date().toISOString(),
    })

    // 4) Se o evento do n8n trouxer título/mensagem de alerta, cria notificação no sino do CRM
    if (title || message || payload?.notification_message) {
      await supabase.from('notifications').insert({
        office_id: office_id || null,
        user_id: payload?.user_id || null,
        title: title || payload?.notification_title || `Evento n8n: ${event_type}`,
        message: message || payload?.notification_message || '',
        type: 'n8n',
        is_read: false,
      })
    }

    return jsonResponse({ ok: true, eventId: log?.id || null })
  } catch {
    return jsonResponse({ ok: false, error: 'internal_error' }, 500)
  }
})
