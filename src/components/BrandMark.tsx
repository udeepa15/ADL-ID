import { CreditCard } from 'lucide-react';

export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(230,0,126,0.6)]">
        <CreditCard className="w-[18px] h-[18px]" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className={`block font-heading font-extrabold text-[17px] ${inverted ? 'text-white' : 'text-ink'}`}>ADL ID Pass</span>
        <span className={`block text-xs ${inverted ? 'text-white/60' : 'text-muted'}`}>by ADL Digi House</span>
      </span>
    </span>
  );
}
