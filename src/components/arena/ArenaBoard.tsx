/*
  ArenaBoard — игровое поле: банк автоматически делится между участниками.
  Сетка адаптивная: 1 игрок — одна большая область, 2 — два тайла,
  3 — 2+1, 4 — 2×2, больше — компактная сетка. Поле перестраивается
  автоматически при добавлении игроков.
*/

import React from 'react';
import type { ArenaRoundState, ArenaParticipant } from '../../lib/arenaShared';
import { ArenaPlayerTile, ArenaEmptyTile } from './ArenaPlayer';

interface ArenaBoardProps {
  round: ArenaRoundState;
  myUserId?: number;
  onJoin: () => void;
  t: (k: string) => string;
}

function gridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 3) return 'grid-cols-2';
  return 'grid-cols-2';
}

export const ArenaBoard: React.FC<ArenaBoardProps> = React.memo(({ round, myUserId, onJoin, t }) => {
  const participants = round.participants;
  const winnerId = round.winnerId;
  const roundFinished = round.status === 'COMPLETED' || round.status === 'CANCELLED' || round.status === 'ERROR';
  const showEmptySlots = !roundFinished && round.status !== 'DRAWING';

  // Сколько всего тайлов показываем: занятые + свободные места (до 6 на экране)
  const emptySlots = showEmptySlots
    ? Math.max(0, Math.min(6, Math.max(participants.length + 1, Math.min(4, round.maxPlayers))) - participants.length)
    : 0;
  const totalTiles = participants.length + emptySlots;

  return (
    <div className="w-full relative">
      {/* мягкое поле-свечение под доской */}
      <span aria-hidden="true" className="pointer-events-none absolute -inset-6 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,152,234,0.10),transparent_65%)]" />
      <div className={`relative grid ${gridClass(totalTiles)} gap-2.5`}>
        {participants.map((p: ArenaParticipant, idx: number) => (
          <ArenaPlayerTile
            key={p.id}
            participant={p}
            index={idx}
            isMe={myUserId != null && p.userId === myUserId}
            isWinner={roundFinished && p.id === winnerId}
            roundFinished={roundFinished}
            wide={totalTiles === 3 && idx === participants.length - 1}
            t={t}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <ArenaEmptyTile
            key={`empty-${i}`}
            onJoin={onJoin}
            label={t('arena_free_slot')}
            hint={t('arena_free_slot_hint')}
            wide={totalTiles === 3 && participants.length + i === 2}
          />
        ))}
      </div>
    </div>
  );
});

ArenaBoard.displayName = 'ArenaBoard';
