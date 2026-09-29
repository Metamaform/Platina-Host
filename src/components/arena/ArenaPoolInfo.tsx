/*
  ArenaPoolInfo — карточка пула: ID, режим, общий банк, участники, таймер.

  Состояния таймера:
  · ACCEPTING_BETS → «Ставки: 13s» + убывающая полоса прогресса;
  · LOCKED → «Ставки закрыты»;
  · DRAWING → «Определение победителя...»;
  · COMPLETED → «Раунд завершён»;
  · WAITING → «Ожидание игроков»;
  · CANCELLED / ERROR → предупреждение.
*/

import React from 'react';
import { Users } from 'lucide-react';
import { GramIcon } from '../GramIcon';
import type { ArenaRoundState } from '../../lib/arenaShared';
import { playersWord } from '../../lib/arenaShared';
import { ARENA_CARD, CardSheen, ArenaStatusChip } from './arenaUi';
import type { ArenaCountdown } from './useArenaCountdown';

interface ArenaPoolInfoProps {
  round: ArenaRoundState;
  countdown: ArenaCountdown;
  t: (k: string) => string;
  lang: string;
}

export const ArenaPoolInfo: React.FC<ArenaPoolInfoProps> = React.memo(({ round, countdown, t, lang }) => {
  const players = round.participants.length;

  let timerLabel: string;
  switch (round.status) {
    case 'WAITING': timerLabel = t('arena_status_waiting'); break;
    case 'ACCEPTING_BETS': timerLabel = countdown.secondsLeft != null && countdown.secondsLeft > 0
      ? `${t('arena_bets_open')}: ${countdown.secondsLeft}s`
      : t('arena_bets_closed');
      break;
    case 'LOCKED': timerLabel = t('arena_bets_closed'); break;
    case 'DRAWING': timerLabel = t('arena_drawing'); break;
    case 'COMPLETED': timerLabel = t('arena_round_finished'); break;
    default: timerLabel = t('arena_round_cancelled');
  }

  const isLive = round.status === 'ACCEPTING_BETS';
  const isDrawing = round.status === 'DRAWING';

  return (
    <div className={`${ARENA_CARD} overflow-hidden w-full px-5 py-4`}>
      <CardSheen />
      {/* мягкое cyan-свечение живого раунда */}
      {isLive && (
        <span aria-hidden="true" className="pointer-events-none absolute -top-10 right-0 w-40 h-24 rounded-full bg-[#0098ea]/20 blur-3xl" />
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-[15px] font-bold text-white/90">
              {t('arena_pool')} #{round.id}
            </span>
            {round.isPrivate && (
              <span className="px-1.5 py-0.5 rounded-md bg-violet-500/15 border border-violet-400/30 text-violet-300 text-[9px] font-extrabold tracking-wider">
                PRIVATE
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-display text-[30px] leading-none font-black text-white display-xl">
              {round.totalPool.toFixed(2)}
            </span>
            <GramIcon className="w-5 h-5 text-brand drop-shadow-[0_0_6px_rgba(0,152,234,0.6)]" />
          </div>
          <div className="mt-1 text-[11px] font-medium text-white/40 uppercase tracking-wider">{t('arena_bank')}</div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-white/[0.07] border border-white/[0.12] text-[10px] font-bold text-white/60 tracking-wider">
            {round.mode}
          </span>
          <span className="flex items-center gap-1 text-[12px] font-semibold text-white/70">
            <Users className="w-3.5 h-3.5 text-white/40" />
            {players} {playersWord(players, lang)}
          </span>
          <ArenaStatusChip status={round.status} label={timerLabel} />
        </div>
      </div>

      {/* Полоса таймера — анимируется только transform (GPU, без layout) */}
      <div className="relative z-10 mt-3.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        {isLive ? (
          <div
            className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-[#0098ea] to-[#00b4d8] shadow-[0_0_10px_rgba(0,152,234,0.7)]"
            style={{ transform: `scaleX(${countdown.progress})`, transformOrigin: 'left center', willChange: 'transform' }}
          />
        ) : (
          <div
            className={`absolute inset-0 rounded-full ${
              round.status === 'COMPLETED'
                ? 'bg-emerald-500/50'
                : round.status === 'DRAWING'
                ? 'bg-cyan-400/60 animate-pulse'
                : round.status === 'CANCELLED' || round.status === 'ERROR'
                ? 'bg-red-500/50'
                : 'bg-white/10'
            }`}
          />
        )}
      </div>
    </div>
  );
});

ArenaPoolInfo.displayName = 'ArenaPoolInfo';
