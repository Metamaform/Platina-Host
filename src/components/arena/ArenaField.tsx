/*
  ArenaField — игровое поле AICE ARENA в визуальном языке Rocket:
  стеклянная карточка-визуализатор (статус-пилюля, номер раунда,
  крупный банк, таймер) + пропорциональное поле участников.

  Никакого крутящегося круга: каждый игрок занимает на поле ровно столько
  места, сколько составляет его доля в банке (ширина сегмента = % доли).
  После завершения раунда поверх поля показывается золотая метка билета —
  то место, куда упал выигрышный ticket (provably fair).
*/

import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { GramIcon } from '../GramIcon';
import type { ArenaParticipant, ArenaRoundState } from '../../lib/arenaShared';
import { playersWord } from '../../lib/arenaShared';
import { ArenaAvatar, ArenaStatusChip } from './arenaUi';
import type { ArenaCountdown } from './useArenaCountdown';

interface ArenaFieldProps {
  round: ArenaRoundState;
  countdown: ArenaCountdown;
  myUserId?: number;
  lang: string;
  onJoin: () => void;
  t: (k: string) => string;
}

// Цвета сегментов поля (до 8 игроков — каждому свой оттенок).
const SEGMENT_COLORS = [
  '#0098ea', // cyan (бренд)
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#d946ef', // fuchsia
  '#84cc16', // lime
];

function statusDot(status: ArenaRoundState['status']): string {
  switch (status) {
    case 'ACCEPTING_BETS': return 'bg-green-400 animate-ping';
    case 'LOCKED': return 'bg-amber-400';
    case 'DRAWING': return 'bg-cyan-300 animate-pulse';
    case 'COMPLETED': return 'bg-emerald-400';
    case 'WAITING': return 'bg-amber-400 animate-pulse';
    default: return 'bg-red-500';
  }
}

const ArenaSegment: React.FC<{
  participant: ArenaParticipant;
  widthPct: number;
  color: string;
  isMe: boolean;
  isWinner: boolean;
  dimmed: boolean;
  isLast: boolean;
}> = React.memo(({ participant, widthPct, color, isMe, isWinner, dimmed, isLast }) => {
  const name = participant.username || participant.firstName || 'Player';
  const pct = widthPct;

  return (
    <div
      title={`${name} — ${pct.toFixed(1)}%`}
      className="relative h-full min-w-0 overflow-hidden flex flex-col items-center justify-center gap-0.5 px-0.5 transition-[width] duration-500 ease-out"
      style={{
        width: `${widthPct}%`,
        flexShrink: 0,
        background: isWinner
          ? `linear-gradient(180deg, ${color}55 0%, ${color}22 100%)`
          : `linear-gradient(180deg, ${color}30 0%, ${color}12 100%)`,
        borderRight: isLast ? 'none' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isWinner ? `inset 0 0 24px ${color}44, 0 0 18px ${color}55` : `inset 0 1px 0 ${color}33`,
        opacity: dimmed && !isWinner ? 0.45 : 1,
      }}
    >
      {isWinner && (
        <span className="absolute top-1 left-1/2 -translate-x-1/2 z-10 text-[11px] leading-none drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]">
          👑
        </span>
      )}
      {isMe && !isWinner && (
        <span
          className="absolute top-1 left-1/2 -translate-x-1/2 z-10 px-1 rounded text-[7px] font-extrabold tracking-wider"
          style={{ background: `${color}44`, color: '#fff', border: `1px solid ${color}88` }}
        >
          YOU
        </span>
      )}

      {/* Наполнение зависит от ширины: узким сегментам — только процент */}
      {pct >= 12 && (
        <>
          <ArenaAvatar participant={participant} className="w-7 h-7" />
          <span className="max-w-full truncate text-[10px] font-bold text-white/85 leading-tight">
            {name}
          </span>
          <span className="text-[12px] font-black text-white leading-none tabular-nums">
            {pct.toFixed(1)}%
          </span>
        </>
      )}
      {pct >= 6 && pct < 12 && (
        <>
          <ArenaAvatar participant={participant} className="w-6 h-6" />
          <span className="text-[10px] font-black text-white leading-none tabular-nums">
            {pct.toFixed(1)}%
          </span>
        </>
      )}
      {pct >= 2.5 && pct < 6 && (
        <span className="text-[9px] font-black text-white/90 leading-none tabular-nums whitespace-nowrap">
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  );
});

ArenaSegment.displayName = 'ArenaSegment';

export const ArenaField: React.FC<ArenaFieldProps> = React.memo(({
  round, countdown, myUserId, lang, onJoin, t,
}) => {
  const participants = round.participants;
  const totalPool = round.totalPool;
  const roundFinished = round.status === 'COMPLETED' || round.status === 'CANCELLED' || round.status === 'ERROR';
  const isCompleted = round.status === 'COMPLETED';
  const isDrawing = round.status === 'DRAWING';
  const isLive = round.status === 'ACCEPTING_BETS';

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

  const showTicket = isCompleted && round.ticket != null && totalPool > 0;
  const ticketLeft = showTicket
    ? Math.max(0, Math.min(100, ((round.ticket as number) / totalPool) * 100))
    : 0;

  return (
    <div className="w-full relative min-h-[250px]">
      {/* Фон-визуализатор в стиле Rocket */}
      <div className="absolute inset-0 rounded-[28px] bg-white/[0.06] backdrop-blur-2xl border border-white/[0.10] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_18px_45px_-16px_rgba(0,0,0,0.85)] pointer-events-none">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0098ea]/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      </div>

      {/* Статус-пилюля (короткая, секунды — в центре поля) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot(round.status)}`} />
        <span className="text-[9px] font-bold tracking-wider uppercase text-white/70 max-w-[140px] truncate">
          {isLive ? t('arena_bets_open') : timerLabel}
        </span>
      </div>

      {/* Номер раунда */}
      <div className="absolute top-4 right-4 z-10 flex items-center justify-center bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 text-[9px] font-bold tracking-wider text-white/70 uppercase">
        #{round.id}
      </div>

      {/* Центр: банк + таймер + пропорциональное поле */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-[54px] pb-4">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.16em]">
          {t('arena_bank')}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="font-display text-[38px] leading-none font-black text-white tabular-nums drop-shadow-md">
            {totalPool.toFixed(2)}
          </span>
          <GramIcon className="w-6 h-6 text-brand drop-shadow-[0_0_8px_rgba(0,152,234,0.6)]" />
        </div>
        <div className="mt-1 text-[11px] font-semibold text-white/45">
          {participants.length} {playersWord(participants.length, lang)}
        </div>

        {/* Таймер приёма ставок — без крутящегося круга, только полоса */}
        {isLive ? (
          <div className="w-full mt-2.5">
            <div className="text-center text-[12px] font-bold text-[#4fc3ff] tabular-nums">
              {countdown.secondsLeft != null && countdown.secondsLeft > 0
                ? `${countdown.secondsLeft}s`
                : timerLabel}
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full w-full rounded-full bg-gradient-to-r from-[#0098ea] to-[#00b4d8] shadow-[0_0_10px_rgba(0,152,234,0.7)]"
                style={{ transform: `scaleX(${countdown.progress})`, transformOrigin: 'left center', willChange: 'transform' }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-2.5">
            <ArenaStatusChip status={round.status} label={timerLabel} />
          </div>
        )}

        {/* Пропорциональное поле участников */}
        {participants.length > 0 ? (
          <div className="relative w-full mt-3 rounded-[20px] overflow-hidden border border-white/[0.10] bg-black/30">
            <div className="flex w-full h-[92px]">
              {participants.map((p: ArenaParticipant, idx: number) => (
                <ArenaSegment
                  key={p.id}
                  participant={p}
                  widthPct={totalPool > 0 ? (p.contribution / totalPool) * 100 : 0}
                  color={SEGMENT_COLORS[idx % SEGMENT_COLORS.length]}
                  isMe={myUserId != null && p.userId === myUserId}
                  isWinner={isCompleted && p.id === round.winnerId}
                  dimmed={roundFinished}
                  isLast={idx === participants.length - 1}
                />
              ))}
            </div>

            {/* Блик розыгрыша поверх поля */}
            {isDrawing && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute top-0 bottom-0 w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ left: ['-25%', '100%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}

            {/* Метка выигрышного билета */}
            {showTicket && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{ left: `${ticketLeft}%` }}
                title={`${t('arena_fair_ticket')}: ${(round.ticket as number).toFixed(2)}`}
              >
                <span className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                <span className="absolute -left-[4px] -top-[1px] w-[8px] h-[8px] rotate-45 bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onJoin}
            className="w-full mt-3 h-[92px] rounded-[20px] border border-dashed border-white/[0.12] bg-white/[0.02] flex flex-col items-center justify-center gap-1.5 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <span className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.10] flex items-center justify-center">
              <Plus className="w-4 h-4 text-white/40" />
            </span>
            <span className="text-[11px] font-bold text-white/45 uppercase tracking-wider">
              {t('arena_free_slot')}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#4fc3ff]/80">
              <GramIcon className="w-3 h-3" />
              {t('arena_free_slot_hint')}
            </span>
          </button>
        )}
      </div>
    </div>
  );
});

ArenaField.displayName = 'ArenaField';
