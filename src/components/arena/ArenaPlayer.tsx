/*
  ArenaPlayer — область одного игрока на игровом поле.
  React.memo: при добавлении нового игрока перерисовываются только
  изменённые тайлы (требование мобильной оптимизации).

  Содержит: позицию, аватар, username, сумму ставки, NFT, процент.
  Состояния: обычный / мой слот / победитель (glow + корона) / проигравший (red).
*/

import React from 'react';
import { Plus } from 'lucide-react';
import { GramIcon } from '../GramIcon';
import type { ArenaParticipant } from '../../lib/arenaShared';
import { ArenaAvatar, ArenaGiftChip, PositionBadge, WinnerCrown } from './arenaUi';

interface ArenaPlayerTileProps {
  participant: ArenaParticipant;
  index: number;
  isMe: boolean;
  isWinner: boolean;
  roundFinished: boolean;
  /** растянуть на всю ширину (сетка из 3 тайлов: 2 + 1 широкий) */
  wide?: boolean;
  onJoin?: () => void;
  t: (k: string) => string;
}

export const ArenaPlayerTile: React.FC<ArenaPlayerTileProps> = React.memo(({
  participant,
  index,
  isMe,
  isWinner,
  roundFinished,
  wide,
  onJoin,
  t,
}) => {
  const lost = roundFinished && !isWinner && participant.status === 'LOST';

  const border = isWinner
    ? 'border-emerald-400/60 bg-emerald-500/[0.08] shadow-[0_0_35px_rgba(16,185,129,0.30),inset_0_1px_0_rgba(255,255,255,0.10)]'
    : isMe
    ? 'border-[#0098ea]/50 bg-[#0098ea]/[0.06] shadow-[0_0_25px_rgba(0,152,234,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]'
    : 'border-white/[0.08] bg-white/[0.04]';

  return (
    <div
      className={`relative rounded-[22px] border p-3 pt-4 flex flex-col items-center justify-between gap-2 min-h-[150px] transition-colors duration-300 ${border} ${lost ? 'opacity-70' : ''} ${wide ? 'col-span-2' : ''}`}
    >
      <PositionBadge index={index} />
      {isWinner && <WinnerCrown />}
      {isMe && !isWinner && (
        <span className="absolute top-2.5 right-2.5 z-10 px-1.5 py-0.5 rounded-md bg-[#0098ea]/20 border border-[#0098ea]/40 text-[8px] font-extrabold tracking-wider text-[#4fc3ff]">
          {t('arena_your_slot')}
        </span>
      )}

      <div className="flex flex-col items-center gap-1.5 mt-2">
        <ArenaAvatar participant={participant} className={`w-12 h-12 ${isWinner ? 'ring-2 ring-emerald-400/70 shadow-[0_0_18px_rgba(16,185,129,0.5)]' : ''}`} />
        <span className={`max-w-full truncate text-[12px] font-bold ${lost ? 'text-white/50' : 'text-white/90'}`}>
          {participant.username || participant.firstName || 'Player'}
        </span>
        {participant.gift && <ArenaGiftChip gift={participant.gift} size="sm" />}
      </div>

      <div className="flex flex-col items-center gap-1 w-full">
        <span className={`flex items-center gap-1 font-display text-[15px] font-black ${lost ? 'text-red-400' : isWinner ? 'text-emerald-300' : 'text-white'}`}>
          {participant.contribution.toFixed(2)}
          <GramIcon className="w-3.5 h-3.5 text-brand" />
        </span>
        {/* доля в банке + мини-бар */}
        <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full ${isWinner ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#0098ea] to-[#00b4d8]'}`}
            style={{ transform: `scaleX(${Math.min(1, participant.percentage / 100)})`, transformOrigin: 'left center' }}
          />
        </div>
        <span className={`text-[10px] font-bold ${lost ? 'text-white/35' : 'text-white/50'}`}>
          {participant.percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
});

ArenaPlayerTile.displayName = 'ArenaPlayerTile';

// ---------------------------------------------------------------------------
// Пустой слот — приглашение сделать ставку
// ---------------------------------------------------------------------------

export const ArenaEmptyTile: React.FC<{ onJoin?: () => void; label: string; hint: string; wide?: boolean }> = ({ onJoin, label, hint, wide }) => (
  <button
    onClick={onJoin}
    className={`relative rounded-[22px] border border-dashed border-white/[0.12] bg-white/[0.02] p-3 flex flex-col items-center justify-center gap-1.5 min-h-[150px] active:scale-[0.98] transition-transform cursor-pointer ${wide ? 'col-span-2' : ''}`}
  >
    <span className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.10] flex items-center justify-center">
      <Plus className="w-4 h-4 text-white/40" />
    </span>
    <span className="text-[11px] font-bold text-white/45 uppercase tracking-wider text-center leading-tight">{label}</span>
    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#4fc3ff]/80">
      <GramIcon className="w-3 h-3" />
      {hint}
    </span>
  </button>
);
