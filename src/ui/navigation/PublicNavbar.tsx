import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const navItems = [
  { to: '/#areas', label: 'Áreas de atuação' },
  { to: '/#escritorio', label: 'O escritório' },
  { to: '/#equipe', label: 'Equipe' },
  { to: '/#contato', label: 'Contato' },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-5 w-6">
      <span className={['absolute left-0 top-0 h-px w-6 rounded bg-cream transition-all', open ? 'translate-y-[9px] rotate-45' : ''].join(' ')} />
      <span className={['absolute left-0 top-[9px] h-px w-6 rounded bg-cream transition-all', open ? 'opacity-0' : 'opacity-100'].join(' ')} />
      <span className={['absolute left-0 top-[18px] h-px w-6 rounded bg-cream transition-all', open ? '-translate-y-[9px] -rotate-45' : ''].join(' ')} />
    </span>
  );
}

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <header
      className={[
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-gold-400/10 bg-luxury/95 backdrop-blur-xl'
          : 'border-b border-white/5 bg-luxury/80 backdrop-blur-md',
      ].join(' ')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="grid size-9 place-items-center overflow-hidden rounded-xl border border-gold-400/20 bg-gold-400/8">
            <img
              src="/brand/logo.jpg"
              alt="Castro e Oliveira Advocacia"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          <div className="leading-tight">
            <div className="font-body text-sm font-semibold tracking-tight text-cream">Castro e Oliveira</div>
            <div className="font-body text-[10px] uppercase tracking-[0.2em] text-gold-400/80">Advocacia</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.to}
              className="font-body text-sm font-light text-cream/55 transition-colors hover:text-cream"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/app"
            className="font-body text-xs font-medium uppercase tracking-[0.15em] text-cream/45 transition-colors hover:text-cream"
          >
            Área do Advogado
          </Link>
          <a
            href={`https://wa.me/5591983485747`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-gold-400/45 px-5 py-2 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400 transition-all hover:bg-gold-400/10 hover:border-gold-400"
          >
            WhatsApp
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2.5 text-cream transition hover:bg-white/10 md:hidden"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <MenuIcon open={open} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden">
          <div
            role="presentation"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 flex h-dvh w-[82vw] max-w-sm flex-col border-l border-white/8 bg-[#0F0D0B] p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div className="font-body text-xs font-semibold uppercase tracking-[0.25em] text-cream/50">Menu</div>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-body text-xs text-cream/70"
                onClick={() => setOpen(false)}
              >
                Fechar
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.to}
                  className="rounded-2xl border border-white/6 bg-white/[0.03] px-5 py-3.5 font-body text-sm font-light text-cream/70 transition hover:border-gold-400/20 hover:text-cream"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href="https://wa.me/5591983485747"
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-gold-400 to-gold-300 py-3.5 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-luxury"
              >
                Falar no WhatsApp
              </a>
              <Link
                to="/app"
                className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 py-3.5 font-body text-[11px] uppercase tracking-[0.15em] text-cream/60"
                onClick={() => setOpen(false)}
              >
                Área do Advogado
              </Link>
            </div>

            <div className="mt-auto pt-8 font-body text-[11px] text-cream/25">
              Site institucional e informativo.
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
