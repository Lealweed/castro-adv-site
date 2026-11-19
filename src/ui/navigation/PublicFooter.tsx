import { Lock, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#04060d]">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-base font-semibold tracking-tight text-slate-200">Castro e Oliveira</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-sky-400/75">
              Advocacia Estratégica · LegalTech
            </div>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-slate-500">
              Site institucional e informativo. Atendimento mediante análise do caso concreto.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Navegação
            </div>
            {[
              { to: '/#areas', label: 'Áreas de atuação' },
              { to: '/#escritorio', label: 'O escritório' },
              { to: '/#equipe', label: 'Equipe' },
              { to: '/#contato', label: 'Contato' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.to}
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Acesso
            </div>
            <a
              href="https://wa.me/5591983485747"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-sky-400/85 transition-colors hover:text-sky-300"
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
              WhatsApp
            </a>
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white"
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
              CRM Jurídico
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6">
          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Castro e Oliveira Advocacia. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
}
