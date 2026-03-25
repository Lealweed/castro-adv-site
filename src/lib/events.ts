// src/lib/events.ts
// Funções para registrar eventos internos de integração
import { requireSupabase } from './supabaseDb';

export async function emitIntegrationEvent({
  officeId,
  eventType,
  entityType,
  entityId,
  payload,
}: {
  officeId?: string | null,
  eventType: string,
  entityType?: string | null,
  entityId?: string | null,
  payload?: any,
}) {
  const sb = requireSupabase();
  const { error } = await sb.from('integration_events').insert({
    office_id: officeId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    payload: payload || {},
  });
  if (error) throw new Error(error.message);
}
