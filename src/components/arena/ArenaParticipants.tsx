/*
  ArenaParticipants — «СПИСОК ИГРОКОВ (N)» под игровым полем.
  Каждый игрок — отдельная строка: аватар, username, сумма, NFT, процент, статус.
  Строки memoized — при добавлении игрока перерисовывается список минимально.
*/

import React from 'react';
import type { ArenaParticipant, ArenaRoundState } from '../../lib/arenaShared';
import { ArenaAvatar, ArenaGiftChip } from './arenaUi';
import { GramIcon } from '../GramIcon';

interface ArenaParticipantsProps {
  round: ArenaRoundState;
  myUserId?: number;
  t: (k: string) => string;
}

const ParticipantRow: React.FC<{ p: ArenaParticipant; isMe: boolean; isWinner: boolean; roundFinished: boolean }> = React.memo(({ p, isMe, isWinner, roundFinished }) => {
  const lost = roundFinished && !isWinner && p.status === 'LOST';
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[18px] border transition-colors duration-300 ${
        isWinner
          ? 'border-emerald-400/40 bg-emerald-500/[0.07]'
          : isMe
          ? 'border-[#0098ea]/40 bg-[#0098ea]/[0.05]'
          : 'border-white/[0.07] bg-white/[0.03]'
      } ${lost ? 'opacity-60' : ''}`}
    >
      <ArenaAvatar participant={p} className="w-9 h-9" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`truncate text-[13px] font-bold ${lost ? 'text-white/50' : 'text-white/90'}`}>
            {p.username || p.firstName || 'Player'}
          </span>
          {isMe && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-[#0098ea]/15 border border-[#0098ea]/35 text-[8px] font-extrabold tracking-wider text-[#4fc3ff]">
              ME
            </span>
          )}
          {isWinner && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-[8px] font-extrabold tracking-wider text-emerald-300">
              {p.status === 'WON' ? 'WON' : p.status}
            </span>
          )}
          {!isWinner && p.status === 'LOST' && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-[8px] font-extrabold tracking-wider text-red-400">
              LOST
            </span>
          )}
          {p.status === 'REFUNDED' && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-white/[0.07] border border-white/[0.14] text-[8px] font-extrabold tracking-wider text-white/50">
              REFUNDED
            </span>
          )}
        </div>
        <div className="mt-0.5 min-w-0">
          {p.gift ? <ArenaGiftChip gift={p.gift} size="sm" /> : (
            <span className="text-[11px] text-white/30 font-medium">{p.isBot ? 'GRAM' : '—'}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className={`flex items-center justify-end gap-1 font-display text-[14px] font-black ${lost ? 'text-red-400' : isWinner ? 'text-emerald-300' : 'text-white'}`}>
          {p.contribution.toFixed(2)}
          <GramIcon className="w-3 h-3 text-brand" />
        </div>
        <div className="text-[10px] font-bold text-white/40 mt-0.5">{p.percentage.toFixed(1)}%</div>
      </div>
    </div>
  );
});

ParticipantRow.displayName = 'ParticipantRow';

export const ArenaParticipants: React.FC<ArenaParticipantsProps> = ({ round, myUserId, t }) => {
  const roundFinished = round.status === 'COMPLETED' || round.status === 'CANCELLED' || round.status === 'ERROR';
  return (
    <div className="w-full flex flex-col gap-2">
      <h3 className="px-1 font-display text-[13px] font-bold text-white/60 uppercase tracking-[0.12em]">
        {t('arena_players_list')} ({round.participants.length})
      </h3>
      <div className="flex flex-col gap-2">
        {round.participants.map((p) => (
          <ParticipantRow
            key={p.id}
            p={p}
            isMe={myUserId != null && p.userId === myUserId}
            isWinner={round.winnerId === p.id}
            roundFinished={roundFinished}
          />
        ))}
      </div>
    </div>
  );
};
