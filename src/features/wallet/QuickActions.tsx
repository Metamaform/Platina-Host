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
          className="group relative overflow-hidden min-h-[88px] rounded-[22px] px-3 py-4 flex flex-col items-center justify-center gap-2.5
            premium-card
            transition-transform duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] cursor-pointer"
        >
          {/* маленькая иконка в чипе */}
          <span
            className={`relative flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.10] ${iconTint} transition-transform duration-150 shadow-sm`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="relative flex flex-col items-center gap-1">
            <span className="text-[14px] font-bold tracking-tight text-white leading-none whitespace-nowrap">
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
