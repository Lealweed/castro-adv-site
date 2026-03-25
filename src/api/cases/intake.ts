// src/api/cases/intake.ts
// Endpoint para intake de caso
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const IntakeCaseSchema = z.object({
  officeId: z.string().uuid(),
  clientId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  area: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

import { requireSupabase } from '@/lib/supabaseDb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = IntakeCaseSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }
  const { officeId, clientId, title, description, area, source } = parse.data;

  try {
    const sb = requireSupabase();
    // Criar caso
    const { data: createdCase, error } = await sb
      .from('cases')
      .insert({
        office_id: officeId,
        client_id: clientId,
        title,
        description,
        area,
        source,
        status: 'aberto',
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);

    // Registrar evento
    await sb.from('integration_events').insert({
      office_id: officeId,
      event_type: 'case.created',
      entity_type: 'case',
      entity_id: createdCase.id,
      payload: { clientId, title, description, area, source },
    });

    return res.status(200).json({ status: 'ok', case: createdCase });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao intake de caso.' });
  }
}
