import { useEffect, useState } from 'react';
import { Card } from '@/ui/widgets/Card';
import { TrendingUp } from 'lucide-react';
import { requireSupabase, getAuthedUser } from '@/lib/supabaseDb';

export function ProductivityPage() {
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [myReport, setMyReport] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sb = requireSupabase();
        const user = await getAuthedUser();
        // Buscar papel do usuário
        const { data: profile } = await sb.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle();
        setRole(profile?.role || '');
        if (profile?.role === 'socio') {
          // Sócio: dashboard consolidado
          const { data } = await sb.from('weekly_reports').select('*').order('created_at', { ascending: false });
          setReports(data || []);
        } else {
          // Colaborador: buscar último relatório
          const { data } = await sb.from('weekly_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
          setMyReport(data?.[0]?.report || '');
        }
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submitReport() {
    setSaving(true);
    setError(null);
    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();
      await sb.from('weekly_reports').insert({ user_id: user.id, report: myReport });
    } catch (e: any) {
      setError(e?.message || 'Erro ao enviar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-white/60">Carregando...</div>;
  if (error) return <div className="p-8 text-red-300">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><TrendingUp className="w-7 h-7" />Produtividade</h1>
      {role === 'socio' ? (
        <Card>
          <div className="text-lg font-semibold text-white mb-2">Relatórios Semanais</div>
          <div className="divide-y divide-white/10">
            {reports.length === 0 ? <div className="text-white/60">Nenhum relatório encontrado.</div> : null}
            {reports.map((r) => (
              <div key={r.id} className="py-3">
                <div className="text-sm text-white/80">{r.report}</div>
                <div className="text-xs text-white/40">{new Date(r.created_at).toLocaleString()} — Usuário: {r.user_id}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-lg font-semibold text-white mb-2">Meu Relatório Semanal</div>
          <textarea className="input min-h-[120px]" value={myReport} onChange={e => setMyReport(e.target.value)} placeholder="Descreva suas entregas, aprendizados e desafios da semana..." />
          <button className="btn-primary mt-3" onClick={submitReport} disabled={saving}>{saving ? 'Enviando...' : 'Enviar Relatório'}</button>
        </Card>
      )}
    </div>
  );
}
