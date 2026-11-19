import type { LucideIcon } from 'lucide-react';

import { Card } from '@/ui/widgets/Card';

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium text-white/60">{label}</div>
        {Icon ? (
          <div className="flex size-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-300">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/50">{hint}</div> : null}
    </Card>
  );
}
