/*
  ArenaMyBet — карточка «ВАША СТАВКА»: сумма, NFT, доля, статус.
  Всегда видна, пока пользователь в раунде.
*/

import React from 'react';
import type { ArenaParticipant, ArenaRoundState } from '../../lib/arenaShared';
import { GramIcon } from '../GramIcon';
import { ARENA_CARD, CardSheen, ArenaGiftChip } from './arenaUi';

interface ArenaMyBetProps {
  myBet: ArenaParticipant;
  round: ArenaRoundState;
  t: (k: string) => string;
}

const STATUS_BADGE: Record<string, { cls: string; key: string }> = {
  ACTIVE: { cls: 'bg-[#0098ea]/15 text-[#4fc3ff] border-[#0098ea]/40', key: 'arena_status_in_game' },
  WON: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', key: 'arena_won' },
  LOST: { cls: 'bg-red-500/15 text-red-400 border-red-500/40', key: 'arena_lost' },
  REFUNDED: { cls: 'bg-white/[0.07] text-white/60 border-white/[0.14]', key: 'arena_refunded' },
};

export const ArenaMyBet: React.FC<ArenaMyBetProps> = React.memo(({ myBet, round, t }) => {
  const isWinner = round.winnerId === myBet.id;
  const badge = STATUS_BADGE[myBet.status] || STATUS_BADGE.ACTIVE;

  return (
    <div className={`${ARENA_CARD} w-full px-4 py-3.5 overflow-hidden ${isWinner ? 'border-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.20),inset_0_1px_0_rgba(255,255,255,0.08)]' : ''}`}>
      <CardSheen />
      <div className="relative z-10 flex items-center gap-3.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#4fc3ff] uppercase">{t('arena_your_bet')}</span>
            <span className={`px-1.5 py-0.5 rounded-md border text-[8px] font-extrabold tracking-wider uppercase ${badge.cls}`}>
              {t(badge.key)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 font-display text-[22px] font-black text-white leading-none">
              {myBet.betAmount.toFixed(2)}
              <GramIcon className="w-4 h-4 text-brand" />
            </span>
            {myBet.gift && <ArenaGiftChip gift={myBet.gift} size="sm" />}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-display text-[20px] font-black leading-none ${isWinner ? 'text-emerald-300' : 'text-white/90'}`}>
            {myBet.percentage.toFixed(1)}%
          </div>
          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mt-1">{t('arena_share')}</div>
        </div>
      </div>
    </div>
  );
});

ArenaMyBet.displayName = 'ArenaMyBet';
