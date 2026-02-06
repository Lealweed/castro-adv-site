import { cn } from '@/ui/utils/cn';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/10 bg-black/20 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5',
        className
      )}
    >
      {children}
    </section>
  );
}
