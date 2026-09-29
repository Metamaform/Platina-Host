/*
  ArenaResult — результат раунда.
  · победитель: «🎉 ПОБЕДА» + выигрыш (зелёное свечение);
  · остальные игроки: «Раунд завершён» (ставка LOST — красный);
  · отмена/ошибка: красный баннер «Раунд отменён, ставки возвращены».
  Анимации только opacity/transform — без перерисовки всей арены.
*/

import React from 'react';
import { motion } from 'motion/react';
import { springSmooth } from '../../lib/motion';
import type { ArenaRoundState, ArenaParticipant } from '../../lib/arenaShared';
import { GramIcon } from '../GramIcon';

interface ArenaResultProps {
  round: ArenaRoundState;
  myBet: ArenaParticipant | null;
  winner: ArenaParticipant | null;
  t: (k: string) => string;
}

export const ArenaResult: React.FC<ArenaResultProps> = ({ round, myBet, winner, t }) => {
  if (round.status === 'CANCELLED' || round.status === 'ERROR') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className="w-full rounded-[20px] border border-red-500/40 bg-red-500/[0.08] px-4 py-3.5 text-center"
      >
        <div className="text-[14px] font-bold text-red-400">
          {round.status === 'CANCELLED' ? t('arena_round_cancelled') : t('arena_error_title')}
        </div>
        <div className="text-[11px] text-red-300/70 mt-0.5">{t('arena_refunded_note')}</div>
      </motion.div>
    );
  }

  if (round.status !== 'COMPLETED' || !winner) return null;

  const iAmWinner = !!myBet && myBet.id === winner.id;
  const iPlayed = !!myBet;

  if (iAmWinner) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springSmooth}
        className="w-full relative overflow-hidden rounded-[24px] border border-emerald-400/50 bg-gradient-to-b from-emerald-500/[0.14] to-emerald-500/[0.05] px-5 py-5 text-center shadow-[0_0_45px_rgba(16,185,129,0.30)]"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-24 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="relative z-10 text-[22px]">🎉</div>
        <div className="relative z-10 font-display text-[20px] font-black text-emerald-300 tracking-wide mt-0.5">
          {t('arena_win_title')}
        </div>
        <div className="relative z-10 text-[11px] font-semibold text-white/50 uppercase tracking-[0.14em] mt-2.5">{t('arena_payout')}</div>
        <div className="relative z-10 flex items-center justify-center gap-1.5 font-display text-[32px] font-black text-white leading-none mt-1">
          +{(round.winAmount || 0).toFixed(2)}
          <GramIcon className="w-6 h-6 text-brand drop-shadow-[0_0_8px_rgba(0,152,234,0.7)]" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSmooth}
      className="w-full rounded-[20px] border border-white/[0.10] bg-white/[0.04] px-4 py-3.5 text-center"
    >
      <div className="text-[13px] font-bold text-white/70">{t('arena_round_finished')}</div>
      {iPlayed && (
        <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-red-400/90 mt-0.5">
          {t('arena_you_lost')} −{myBet!.contribution.toFixed(2)}
          <GramIcon className="w-3 h-3 text-red-400/90" />
        </div>
      )}
      <div className="text-[11px] text-white/40 mt-1">
        {t('arena_winner_label')}: <span className="text-white/75 font-bold">@{winner.username || winner.firstName}</span>
      </div>
    </motion.div>
  );
};
