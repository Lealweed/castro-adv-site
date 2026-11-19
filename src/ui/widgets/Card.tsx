import { cn } from '@/ui/utils/cn';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_32px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-colors duration-200 hover:border-white/[0.14] sm:p-5',
        className
      )}
    >
      {children}
    </section>
  );
}
