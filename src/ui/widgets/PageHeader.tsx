import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/ui/utils/cn';

export type PageHeaderAccent = 'sky' | 'indigo' | 'emerald' | 'violet';

const ACCENT_MAP: Record<
  PageHeaderAccent,
  {
    iconBox: string;
    eyebrow: string;
    hairline: string;
    glow: string;
  }
> = {
  sky: {
    iconBox: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
    eyebrow: 'text-sky-300/90',
    hairline: 'via-sky-400/45',
    glow: 'bg-[radial-gradient(520px_180px_at_0%_0%,rgba(56,189,248,0.14),transparent_60%)]',
  },
  indigo: {
    iconBox: 'border-indigo-400/25 bg-indigo-400/10 text-indigo-300',
    eyebrow: 'text-indigo-300/90',
    hairline: 'via-indigo-400/45',
    glow: 'bg-[radial-gradient(520px_180px_at_0%_0%,rgba(99,102,241,0.14),transparent_60%)]',
  },
  emerald: {
    iconBox: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    eyebrow: 'text-emerald-300/90',
    hairline: 'via-emerald-400/45',
    glow: 'bg-[radial-gradient(520px_180px_at_0%_0%,rgba(16,185,129,0.14),transparent_60%)]',
  },
  violet: {
    iconBox: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
    eyebrow: 'text-violet-300/90',
    hairline: 'via-violet-400/45',
    glow: 'bg-[radial-gradient(520px_180px_at_0%_0%,rgba(139,92,246,0.14),transparent_60%)]',
  },
};

export function IconBox({
  icon: Icon,
  accent = 'sky',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  accent?: PageHeaderAccent;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const palette = ACCENT_MAP[accent];
  const sizing =
    size === 'sm'
      ? 'size-9 rounded-lg'
      : size === 'lg'
        ? 'size-12 rounded-2xl'
        : 'size-11 rounded-xl';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center border shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
        sizing,
        palette.iconBox,
        className,
      )}
    >
      <Icon className={iconSize} strokeWidth={1.75} />
    </div>
  );
}

export type PageHeaderProps = {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  accent?: PageHeaderAccent;
  className?: string;
};

export function PageHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  badge,
  actions,
  accent = 'sky',
  className,
}: PageHeaderProps) {
  const palette = ACCENT_MAP[accent];

  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl',
        className,
      )}
    >
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent', palette.hairline)} />
      <div className={cn('pointer-events-none absolute inset-0', palette.glow)} />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <IconBox icon={icon} accent={accent} />

          <div className="min-w-0">
            {eyebrow ? (
              <div className={cn('mb-0.5 text-[11px] font-semibold uppercase tracking-[0.18em]', palette.eyebrow)}>
                {eyebrow}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h1>
              {badge}
            </div>

            {subtitle ? <p className="mt-0.5 text-sm text-white/60">{subtitle}</p> : null}
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
