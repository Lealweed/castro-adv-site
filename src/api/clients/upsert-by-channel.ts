// src/api/clients/upsert-by-channel.ts
// Endpoint para upsert de cliente por canal
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const UpsertClientSchema = z.object({
  officeId: z.string().uuid(),
  name: z.string().min(1),
  whatsapp: z.string().min(8),
  cpf: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  source: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional(),
});

import { requireSupabase } from '@/lib/supabaseDb';
import { normalizePhoneE164 } from '@/lib/phoneE164';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = UpsertClientSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }
  const { officeId, name, whatsapp, cpf, email, source, metadata } = parse.data;

  try {
    const sb = requireSupabase();
    const whatsappE164 = normalizePhoneE164(whatsapp);
    // Buscar cliente existente
    let client = null;
    let created = false;
    const { data: found, error } = await sb
      .from('clients')
      .select('id')
      .eq('office_id', officeId)
      .eq('whatsapp', whatsappE164)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (found) {
      // Atualizar
      const { data: updated, error: upErr } = await sb
        .from('clients')
        .update({ name, cpf, email, whatsapp: whatsappE164, source, metadata })
        .eq('id', found.id)
        .select()
        .maybeSingle();
      if (upErr) throw new Error(upErr.message);
      client = updated;
    } else {
      // Criar
      const { data: createdRow, error: crErr } = await sb
        .from('clients')
        .insert({ office_id: officeId, name, cpf, email, whatsapp: whatsappE164, source, metadata })
        .select()
        .maybeSingle();
      if (crErr) throw new Error(crErr.message);
      client = createdRow;
      created = true;
    }
    // Registrar evento
    await sb.from('integration_events').insert({
      office_id: officeId,
      event_type: created ? 'client.created' : 'client.updated',
      entity_type: 'client',
      entity_id: client.id,
      payload: { name, whatsapp: whatsappE164, cpf, email, source, metadata },
    });
    return res.status(200).json({ status: 'ok', client });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao upsert cliente.' });
  }
}
