import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

interface QuickActionsProps {
  onDeposit: () => void;
  onWithdraw: () => void;
}

interface QuickActionConfig {
  id: 'deposit' | 'withdraw';
  label: string;
  /** Небольшая подпись под названием (например, «Скоро») */
  caption?: string;
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
  const { t } = useTranslation();
  const actions: QuickActionConfig[] = [
    { id: 'deposit', label: t('topup'), icon: ArrowDown, iconTint: 'text-brand', onClick: onDeposit },
    { id: 'withdraw', label: t('withdraw'), caption: t('soon_withdraw_gram'), icon: ArrowUp, iconTint: 'text-white/90', onClick: onWithdraw },
  ];

  return (
    <nav aria-label={t('wallet')} className="quick-actions grid grid-cols-2 gap-3">
      {actions.map(({ id, label, caption, icon: Icon, iconTint, onClick }) => (
        <button
          key={id}
          type="button"
          onClick={onClick}
          aria-label={caption ? `${label}. ${caption}` : label}
          className="group relative overflow-hidden min-h-[88px] rounded-[24px] px-3 py-4 flex flex-col items-center justify-center gap-2.5
            lg-glass
            transition-all duration-200
            active:scale-[0.98]
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
            className={`relative flex h-9 w-9 items-center justify-center rounded-full lg-glass ${iconTint} transition-transform duration-150 group-active:scale-95`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="relative flex flex-col items-center gap-1">
            <span className="text-[15px] font-semibold tracking-tight text-white leading-none whitespace-nowrap">
              {label}
            </span>
            {caption && (
              <span className="text-[11px] font-medium text-white/50 leading-none whitespace-nowrap">
                {caption}
              </span>
            )}
          </span>
        </button>
      ))}
    </nav>
  );
}
