import { Card } from '@/ui/widgets/Card';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Configurações</h1>
        <p className="text-sm text-white/60">Organização, usuários, integrações (mock).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white">Organização</div>
          <div className="mt-3 grid gap-3">
            <Field label="Nome" value="Castro de Oliveira Advocacia" />
            <Field label="Plano" value="Pro" />
            <Field label="Fuso" value="America/Sao_Paulo" />
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Integrações</div>
          <ul className="mt-3 space-y-2 text-sm">
            {['WhatsApp', 'E-mail', 'Google Calendar', 'n8n'].map((x) => (
              <li key={x} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-white/80">{x}</span>
                <span className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/70">
                  Em breve
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
