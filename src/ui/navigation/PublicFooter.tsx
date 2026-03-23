export function PublicFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#0A0806]">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="font-display text-base italic text-cream/70">Castro e Oliveira</div>
            <div className="mt-1 font-body text-[10px] uppercase tracking-[0.25em] text-gold-400/60">
              Advocacia Estratégica
            </div>
            <p className="mt-4 max-w-xs font-body text-xs font-light leading-relaxed text-cream/25">
              Site institucional e informativo. Atendimento mediante análise do caso concreto.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-body text-[10px] font-semibold uppercase tracking-[0.25em] text-cream/30">
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
                className="font-body text-xs font-light text-cream/35 transition-colors hover:text-cream/70"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-body text-[10px] font-semibold uppercase tracking-[0.25em] text-cream/30">
              Acesso
            </div>
            <a
              href="https://wa.me/5591983485747"
              target="_blank"
              rel="noreferrer"
              className="font-body text-xs font-light text-gold-400/70 transition-colors hover:text-gold-400"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/5 pt-6">
          <div className="font-body text-[10px] text-cream/20">
            © {new Date().getFullYear()} Castro e Oliveira Advocacia. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
}
