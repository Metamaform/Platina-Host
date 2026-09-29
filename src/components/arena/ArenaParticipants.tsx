/*
  ArenaParticipants — «СПИСОК ИГРОКОВ (N)» в стиле Rocket:
  те же карточки, сортировка и цвета исхода (зелёный — победа,
  красный — проигрыш). Слева: аватар, имя, бейдж YOU, ставка и доля.
  Справа: выигрыш / проигрыш / текущая доля.
  Сортировка как в Rocket: при завершении — победитель первый,
  в живой игре — своя ставка первая, дальше по убыванию вклада.
*/

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Users } from 'lucide-react';
import type { ArenaParticipant, ArenaRoundState } from '../../lib/arenaShared';
import { ArenaAvatar, ArenaGiftChip } from './arenaUi';
import { GramIcon } from '../GramIcon';

interface ArenaParticipantsProps {
  round: ArenaRoundState;
  myUserId?: number;
  t: (k: string) => string;
}

const ParticipantRow: React.FC<{
  p: ArenaParticipant;
  isMe: boolean;
  isWon: boolean;
  isLost: boolean;
  winAmount: number;
  youLabel: string;
}> = React.memo(({ p, isMe, isWon, isLost, winAmount, youLabel }) => {
  const name = p.username || p.firstName || 'Player';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex items-center justify-between rounded-[22px] p-3 transition-colors duration-300 ${
        isWon
          ? 'border border-emerald-500/80 bg-emerald-950/20'
          : isLost
          ? 'border border-red-500/80 bg-red-950/20'
          : 'border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <ArenaAvatar participant={p} className="w-10 h-10" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-medium text-[15px] truncate max-w-[120px]">
              {name}
            </span>
            {isMe && (
              <span className="text-[10px] bg-white/10 text-white/90 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {youLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/50 mt-0.5">
            <span className="flex items-center gap-1">
              <GramIcon className="w-3 h-3 text-white/40" />
              {p.contribution.toFixed(2)}
            </span>
            <span>•</span>
            <span className={isWon ? 'text-emerald-400 font-semibold' : isLost ? 'text-red-400 font-semibold' : 'text-white/60'}>
              {p.percentage.toFixed(1)}%
            </span>
          </div>
          {p.gift && (
            <div className="mt-1">
              <ArenaGiftChip gift={p.gift} size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* Правая сторона: исход ставки */}
      {isWon ? (
        <div className="flex flex-col items-end justify-center px-2 py-1">
          <div className="flex items-center gap-1 text-emerald-400 font-display font-bold text-[15px] leading-tight">
            <span>+{winAmount.toFixed(2)}</span>
            <GramIcon className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
            {p.percentage.toFixed(1)}%
          </span>
        </div>
      ) : isLost ? (
        <div className="flex flex-col items-end justify-center px-2 py-1">
          <div className="flex items-center gap-1 text-red-400 font-display font-bold text-[15px] leading-tight">
            <span>-{p.contribution.toFixed(2)}</span>
            <GramIcon className="w-3.5 h-3.5 text-red-400" />
          </div>
          <span className="text-[10px] text-red-400/70 font-medium mt-0.5">
            {p.percentage.toFixed(1)}%
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-end justify-center px-2 py-1">
          <div className="flex items-center gap-1 text-white/80 font-display font-bold text-[14px] leading-tight">
            <span>{p.contribution.toFixed(2)}</span>
            <GramIcon className="w-3.5 h-3.5 text-white/50" />
          </div>
          <span className="text-[10px] text-white/40 mt-0.5">
            {p.percentage.toFixed(1)}%
          </span>
        </div>
      )}
    </motion.div>
  );
});

ParticipantRow.displayName = 'ParticipantRow';

export const ArenaParticipants: React.FC<ArenaParticipantsProps> = ({ round, myUserId, t }) => {
  const isCompleted = round.status === 'COMPLETED';

  const sorted = useMemo(() => {
    const all = [...round.participants];
    if (isCompleted) {
      // Завершён: победитель первый, проигравшие — по убыванию вклада.
      const winners = all
        .filter((p) => p.id === round.winnerId)
        .sort((a, b) => b.contribution - a.contribution);
      const losers = all
        .filter((p) => p.id !== round.winnerId)
        .sort((a, b) => {
          if (myUserId != null && a.userId === myUserId) return -1;
          if (myUserId != null && b.userId === myUserId) return 1;
          return b.contribution - a.contribution;
        });
      return [...winners, ...losers];
    }
    // Живая игра: своя ставка первая, дальше по убыванию вклада.
    return all.sort((a, b) => {
      if (myUserId != null && a.userId === myUserId) return -1;
      if (myUserId != null && b.userId === myUserId) return 1;
      return b.contribution - a.contribution;
    });
  }, [round.participants, round.winnerId, isCompleted, myUserId]);

  if (!sorted.length) return null;

  return (
    <div className="w-full flex flex-col gap-2.5">
      <div className="flex items-center gap-2 px-1">
        <Users className="w-4 h-4 text-white/50" />
        <span className="text-white font-bold text-xs">
          {t('arena_players_list')} ({round.participants.length})
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {sorted.map((p) => (
          <ParticipantRow
            key={p.id}
            p={p}
            isMe={myUserId != null && p.userId === myUserId}
            isWon={isCompleted && p.id === round.winnerId}
            isLost={isCompleted && p.id !== round.winnerId}
            winAmount={round.winAmount || round.totalPool}
            youLabel={t('you')}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
