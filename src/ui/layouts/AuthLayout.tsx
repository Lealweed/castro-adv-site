import { Scale, ShieldCheck, UsersRound } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-dvh bg-[#050811] text-slate-100 app-bg-dark theme-dark">
      <div className="mx-auto flex min-h-dvh max-w-[1100px] items-center px-4 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-center">
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-3.5 py-1.5 text-xs font-medium text-sky-200">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
              Castro & Oliveira Advocacia
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="size-14 overflow-hidden rounded-2xl border border-sky-400/25 bg-slate-900 shadow-[0_12px_32px_rgba(56,189,248,0.16)]">
                <img src="/brand/logo.jpg" alt="Castro & Oliveira" className="h-full w-full object-cover" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">CRM Jurídico</h1>
                <p className="mt-0.5 font-mono text-xs uppercase tracking-[0.2em] text-sky-300/80">
                  Legal OS · Workspace Seguro
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
              Ambiente operacional para gestão de clientes, processos, prazos, financeiro e inteligência do escritório.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                { t: 'Clientes & Triagem', d: 'Cadastro centralizado, contatos, LGPD e linha do tempo.', icon: UsersRound },
                { t: 'Casos & Prazos', d: 'Esteira processual integrada com Radar PJe e DataJud.', icon: Scale },
                { t: 'Segurança Multi-Tenant', d: 'Isolamento criptográfico por organização e auditoria.', icon: ShieldCheck },
              ].map((x) => {
                const FeatureIcon = x.icon;
                return (
                  <div key={x.t} className="flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/60 p-4 backdrop-blur-xl">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
                      <FeatureIcon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{x.t}</div>
                      <div className="mt-0.5 text-xs text-white/60">{x.d}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
