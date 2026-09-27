import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface QuickActionsProps {
  onDeposit: () => void;
  onWithdraw: () => void;
}

interface QuickActionConfig {
  id: 'deposit' | 'withdraw';
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconTint: string;
  onClick: () => void;
}

/**
 * Быстрые действия кошелька — «жидкое стекло»:
 * полупрозрачная поверхность + backdrop-blur + тонкая верхняя подсветка.
 * Иконки мелкие (16px в стеклянном чипе), подпись не выходит за границы.
 */
export function QuickActions({ onDeposit, onWithdraw }: QuickActionsProps) {
  const actions: QuickActionConfig[] = [
    { id: 'deposit', label: 'Пополнить', icon: ArrowDown, iconTint: 'text-brand', onClick: onDeposit },
    { id: 'withdraw', label: 'Вывод', icon: ArrowUp, iconTint: 'text-white/90', onClick: onWithdraw },
  ];

  return (
    <nav aria-label="Быстрые действия" className="quick-actions grid grid-cols-2 gap-3">
      {actions.map(({ id, label, icon: Icon, iconTint, onClick }) => (
        <button
          key={id}
          type="button"
          onClick={onClick}
          aria-label={label}
          className="group relative overflow-hidden min-h-[88px] rounded-[24px] px-3 py-4 flex flex-col items-center justify-center gap-2.5
            bg-white/[0.07] backdrop-blur-2xl border border-white/[0.10]
            shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_16px_32px_-20px_rgba(0,0,0,0.85)]
            transition-all duration-200 hover:bg-white/[0.10] hover:border-white/[0.16]
            active:scale-[0.98] active:bg-white/[0.09]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF] cursor-pointer"
        >
          {/* верхнее бликовое свечение — эффект жидкого стекла */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 w-4/5 h-16 rounded-full bg-white/[0.10] blur-2xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          />
          {/* маленькая иконка в стеклянном чипе */}
          <span
            className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${iconTint} transition-transform duration-150 group-active:scale-95`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="relative text-[15px] font-semibold tracking-tight text-white leading-none whitespace-nowrap">
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}
