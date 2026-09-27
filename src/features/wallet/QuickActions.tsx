import React from 'react';
import { ArrowDown, ArrowUp, ArrowLeftRight, Coins } from 'lucide-react';

type ActionId = 'deposit' | 'withdraw' | 'swap' | 'staking';

interface QuickActionConfig {
  id: ActionId;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  onClick: () => void;
}

interface QuickActionsProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onSwap: () => void;
  onStaking: () => void;
  hint?: string | null;
}

function StackingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <ellipse cx="12" cy="8" rx="8" ry="4" />
      <path d="M4 14.5c0 2.2 3.6 4 8 4s8-1.8 8-4" />
    </svg>
  );
}

export function QuickActions({ onDeposit, onWithdraw, onSwap, onStaking }: QuickActionsProps) {
  const actions: QuickActionConfig[] = [
    { id: 'deposit', label: 'Пополнить', icon: ArrowDown, onClick: onDeposit },
    { id: 'withdraw', label: 'Вывод', icon: ArrowUp, onClick: onWithdraw },
    { id: 'swap', label: 'Обменять', icon: ArrowLeftRight, onClick: onSwap },
    { id: 'staking', label: 'Стейкинг', icon: Coins as any, onClick: onStaking },
  ];

  // Use custom icon for staking to match spec: rings/coins
  const getIcon = (id: ActionId, Icon: any) => {
    if (id === 'staking') {
      return <StackingIcon className="w-10 h-10 text-[#1683FF]" />;
    }
    return <Icon aria-hidden="true" size={40} className="text-[#1683FF] mx-auto mb-3 block" strokeWidth={2.6} />;
  };

  return (
    <nav className="quick-actions" aria-label="Быстрые действия">
      <div className="grid grid-cols-4 gap-[14px] max-[540px]:flex max-[540px]:overflow-x-auto max-[540px]:snap-x max-[540px]:snap-mandatory max-[540px]:pb-2 max-[540px]:scrollbar-hide max-[540px]:grid-cols-none">
        {actions.map(({ id, label, icon: Icon, onClick }) => (
          <button
            key={id}
            type="button"
            className="quick-action group relative flex flex-col items-center justify-center min-h-[112px] md:min-h-[132px] rounded-[28px] bg-[#171719] border border-[#353539] text-white font-bold text-[20px] md:text-[22px] leading-[1.1] transition-all duration-150 active:scale-[0.98] hover:bg-[#1e1e21] hover:border-[#4a4a50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] max-[540px]:min-w-[142px] max-[540px]:snap-start max-[540px]:shrink-0 cursor-pointer"
            onClick={onClick}
            aria-label={label}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <span className="transition-transform duration-100 group-active:scale-95 flex flex-col items-center">
              {getIcon(id, Icon)}
              <span className="text-[18px] md:text-[20px] font-bold tracking-tight">{label}</span>
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
