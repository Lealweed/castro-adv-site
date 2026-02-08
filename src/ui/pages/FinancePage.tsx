import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/ui/widgets/Card';
import {
  brlToCents,
  centsToBRL,
  createFinanceTx,
  ensureCategory,
  listCategories,
  listFinanceTx,
  type FinanceCategory,
  type FinanceTx,
} from '@/lib/finance';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function FinancePage() {
  const [rows, setRows] = useState<FinanceTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [status, setStatus] = useState<'planned' | 'paid'>('planned');
  const [occurredOn, setOccurredOn] = useState(() => todayStr());
  const [dueDate, setDueDate] = useState(() => todayStr());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const data = await listFinanceTx(50);
      setRows(data);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar financeiro.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listCategories(type);
        if (!alive) return;
        setCategories(data);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [type]);

  const summary = useMemo(() => {
    const plannedIncome = rows
      .filter((r) => r.type === 'income' && r.status === 'planned')
      .reduce((a, r) => a + r.amount_cents, 0);
    const plannedExpense = rows
      .filter((r) => r.type === 'expense' && r.status === 'planned')
      .reduce((a, r) => a + r.amount_cents, 0);
    const paidIncome = rows
      .filter((r) => r.type === 'income' && r.status === 'paid')
      .reduce((a, r) => a + r.amount_cents, 0);
    const paidExpense = rows
      .filter((r) => r.type === 'expense' && r.status === 'paid')
      .reduce((a, r) => a + r.amount_cents, 0);
    return { plannedIncome, plannedExpense, paidIncome, paidExpense };
  }, [rows]);

  async function onCreate() {
    if (!description.trim()) return;
    const cents = brlToCents(amount);
    if (cents === null) {
      setError('Valor inválido. Ex: 1500,00');
      return;
    }

    // For receivable/payable items, due_date drives reminders.
    const effectiveDueDate = status === 'planned' ? dueDate : null;

    if (status === 'planned' && !effectiveDueDate) {
      setError('Informe o vencimento.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let catId: string | null = categoryId || null;
      if (!catId && newCategoryName.trim()) {
        catId = await ensureCategory(type, newCategoryName.trim());
      }

      await createFinanceTx({
        type,
        status,
        occurred_on: occurredOn,
        due_date: effectiveDueDate,
        category_id: catId,
        description: description.trim(),
        amount_cents: cents,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      });

      setCreateOpen(false);
      setDescription('');
      setAmount('');
      setNotes('');
      setCategoryId('');
      setNewCategoryName('');
      setStatus('planned');
      setType('income');
      setPaymentMethod('pix');
      setOccurredOn(todayStr());
      setDueDate(todayStr());
      setSaving(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar lançamento.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Financeiro</h1>
          <p className="text-sm text-white/60">
            Lançamentos reais. Avisos: enviaremos WhatsApp + e-mail 1 dia antes do vencimento (quando a integração estiver
            ligada).
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          Novo lançamento
        </button>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <div className="text-xs text-white/60">Receitas (pagas)</div>
          <div className="mt-2 text-2xl font-semibold text-white">{centsToBRL(summary.paidIncome)}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/60">Despesas (pagas)</div>
          <div className="mt-2 text-2xl font-semibold text-white">{centsToBRL(summary.paidExpense)}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/60">A receber</div>
          <div className="mt-2 text-2xl font-semibold text-white">{centsToBRL(summary.plannedIncome)}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/60">A pagar</div>
          <div className="mt-2 text-2xl font-semibold text-white">{centsToBRL(summary.plannedExpense)}</div>
        </Card>
      </div>

      {createOpen ? (
        <Card>
          <div className="grid gap-4">
            <div className="text-sm font-semibold text-white">Novo lançamento</div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm text-white/80">
                Tipo
                <select className="select" value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </label>
              <label className="text-sm text-white/80">
                Status
                <select className="select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="planned">Previsto</option>
                  <option value="paid">Pago</option>
                </select>
              </label>
              <label className="text-sm text-white/80">
                Data (lançamento)
                <input type="date" className="input" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
              </label>

              {status === 'planned' ? (
                <label className="text-sm text-white/80">
                  Vencimento
                  <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </label>
              ) : null}

              <label className={status === 'planned' ? 'md:col-span-2 text-sm text-white/80' : 'md:col-span-2 text-sm text-white/80'}>
                Descrição
                <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="text-sm text-white/80">
                Valor (R$)
                <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500,00" />
              </label>

              <label className="text-sm text-white/80">
                Método
                <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="pix">PIX</option>
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartão</option>
                  <option value="transfer">Transferência</option>
                </select>
              </label>

              <label className="text-sm text-white/80">
                Categoria
                <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Sem categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="md:col-span-2 text-sm text-white/80">
                Criar categoria (opcional)
                <input
                  className="input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={type === 'income' ? 'Ex: Honorários' : 'Ex: Custas'}
                />
              </label>

              <label className="md:col-span-3 text-sm text-white/80">
                Observações
                <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button disabled={saving} onClick={onCreate} className="btn-primary">
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button disabled={saving} onClick={() => setCreateOpen(false)} className="btn-ghost">
                Cancelar
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="text-sm font-semibold text-white">Lançamentos</div>
        <div className="mt-3">
          {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}
          {!loading && rows.length === 0 ? <div className="text-sm text-white/60">Nenhum lançamento ainda.</div> : null}

          <div className="mt-3 grid gap-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {r.description}{' '}
                      <span className={r.type === 'income' ? 'badge badge-gold' : 'badge'}>
                        {r.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Lançamento: {r.occurred_on}
                      {r.due_date ? ` · Venc.: ${r.due_date}` : ''} ·{' '}
                      {r.status === 'paid' ? 'Pago' : r.status === 'planned' ? 'Previsto' : r.status}
                      {r.payment_method ? ` · ${r.payment_method}` : ''}
                      {r.reminder_1d_sent_at ? ' · Aviso 1d: enviado' : ''}
                    </div>
                    {r.notes ? <div className="mt-1 text-xs text-white/50">Obs: {r.notes}</div> : null}
                  </div>
                  <div className="text-sm font-semibold text-white">{centsToBRL(r.amount_cents)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
