import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

export type FinanceTx = {
  id: string;
  type: 'income' | 'expense' | string;
  status: 'planned' | 'paid' | 'cancelled' | string;
  occurred_on: string;
  due_date: string | null;
  description: string;
  amount_cents: number;
  payment_method: string | null;
  notes: string | null;
  reminder_1d_sent_at: string | null;
  created_at: string;
};

export function centsToBRL(cents: number) {
  const v = (cents || 0) / 100;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function brlToCents(input: string) {
  // accepts "1234,56" or "1234.56" or "R$ 1.234,56"
  const cleaned = input.replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '');
  const normalized = cleaned.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export async function listFinanceTx(limit = 50): Promise<FinanceTx[]> {
  const sb = requireSupabase();
  await getAuthedUser();
  const { data, error } = await sb
    .from('finance_transactions')
    .select('id,type,status,occurred_on,due_date,description,amount_cents,payment_method,notes,reminder_1d_sent_at,created_at')
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as FinanceTx[];
}

export async function createFinanceTx(payload: {
  type: 'income' | 'expense';
  status: 'planned' | 'paid';
  occurred_on: string;
  due_date?: string | null;
  description: string;
  amount_cents: number;
  payment_method?: string | null;
  notes?: string | null;
}) {
  const sb = requireSupabase();
  const user = await getAuthedUser();

  const { error } = await sb.from('finance_transactions').insert({
    user_id: user.id,
    ...payload,
    due_date: payload.due_date || null,
    payment_method: payload.payment_method || null,
    notes: payload.notes || null,
  });

  if (error) throw new Error(error.message);
}
