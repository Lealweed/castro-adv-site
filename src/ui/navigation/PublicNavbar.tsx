import { Lock, Menu, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const navItems = [
  { to: '/#areas', label: 'Áreas de atuação' },
  { to: '/#escritorio', label: 'O escritório' },
  { to: '/#equipe', label: 'Equipe' },
  { to: '/#contato', label: 'Contato' },
];

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
          ? 'border-b border-sky-400/15 bg-[#050811]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]'
          : 'border-b border-white/[0.06] bg-[#050811]/80 backdrop-blur-md',
      ].join(' ')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="grid size-9 place-items-center overflow-hidden rounded-xl border border-sky-400/25 bg-slate-900 shadow-[0_0_20px_rgba(56,189,248,0.14)]">
            <img
              src="/brand/logo.jpg"
              alt="Castro e Oliveira Advocacia"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-slate-100">Castro e Oliveira</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400/85">Advocacia</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.to}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-white"
          >
            <Lock className="h-3.5 w-3.5 text-sky-400" strokeWidth={1.75} />
            Área do Advogado
          </Link>
          <a
            href="https://wa.me/5591983485747"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-300 transition-all hover:border-sky-400 hover:bg-sky-400/20 hover:text-sky-200"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
            WhatsApp
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-100 transition hover:bg-white/10 md:hidden"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden">
          <div
            role="presentation"
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 flex h-dvh w-[82vw] max-w-sm flex-col border-l border-white/[0.08] bg-[#050811] p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Menu</div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                Fechar
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.to}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-sky-400/25 hover:text-white"
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
                className="btn-primary w-full rounded-xl py-3 text-xs uppercase tracking-[0.14em]"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                Falar no WhatsApp
              </a>
              <Link
                to="/app"
                className="btn-ghost w-full rounded-xl py-3 text-xs uppercase tracking-[0.14em]"
                onClick={() => setOpen(false)}
              >
                <Lock className="h-4 w-4 text-sky-400" strokeWidth={1.75} />
                Área do Advogado
              </Link>
            </div>

            <div className="mt-auto pt-8 text-[11px] text-slate-500">
              Site institucional e informativo.
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
