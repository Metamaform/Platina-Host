/*
  ArenaActions — одна главная CTA-кнопка в стиле Rocket:
  · свободный слот → яркий синий градиент «СДЕЛАТЬ СТАВКУ»;
  · своя ставка уже в банке → стеклянная «Ставка принята • сумма • доля»;
  · ставки недоступны → стеклянная с замком и причиной.
  Выбор NFT переехал внутрь модалки ставки (как в Rocket), отдельной
  кнопки больше нет.
*/

import React from 'react';
import { Check, Lock } from 'lucide-react';
import type { ArenaParticipant } from '../../lib/arenaShared';

interface ArenaActionsProps {
  canBet: boolean;
  myBet: ArenaParticipant | null;
  disabledReason: string | null;
  onBet: () => void;
  t: (k: string) => string;
}

export const ArenaActions: React.FC<ArenaActionsProps> = React.memo(({
  canBet,
  myBet,
  disabledReason,
  onBet,
  t,
}) => {
  // Своя ставка уже принята — информационная стеклянная кнопка.
  if (myBet) {
    return (
      <div className="w-full rounded-full font-display font-bold text-[15px] tracking-wide py-4 bg-white/[0.05] border border-white/[0.10] text-white/80 flex items-center justify-center gap-2 select-none">
        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="truncate px-2">
          {t('arena_bet_placed')} • {myBet.contribution.toFixed(2)} G • {myBet.percentage.toFixed(1)}%
        </span>
      </div>
    );
  }

  if (canBet) {
    return (
      <button
        onClick={onBet}
        className="w-full relative overflow-hidden group rounded-full font-display font-bold text-[17px] tracking-wide active:scale-[0.98] transition-all py-4 shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white cursor-pointer select-none"
      >
        {t('arena_make_bet')}
      </button>
    );
  }

  return (
    <div
      title={disabledReason || undefined}
      className="w-full rounded-full font-display font-bold text-[14px] tracking-wide py-4 bg-white/[0.05] border border-white/[0.08] text-white/35 flex items-center justify-center gap-2 select-none"
    >
      <Lock className="w-4 h-4 shrink-0" />
      <span className="truncate px-2">{disabledReason || t('arena_bets_closed')}</span>
    </div>
  );
});

ArenaActions.displayName = 'ArenaActions';
