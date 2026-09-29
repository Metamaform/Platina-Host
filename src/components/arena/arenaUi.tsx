/*
  Мелкие переиспользуемые элементы UI AICE ARENA.
  Визуальный язык Rocket/Crash: тёмные карточки, тонкие светлые границы,
  большие скругления, фото-аватары (dicebear фолбэк), цвета исхода —
  emerald (победа) / red (проигрыш).
*/

import React from 'react';
import { PremiumImage } from '../PremiumImage';
import type { ArenaParticipant, ArenaStatus } from '../../lib/arenaShared';

// ---------------------------------------------------------------------------
// Аватар игрока — один в один как в Crash: фото или dicebear-аватар,
// нейтральный фон и тонкая светлая рамка (без цветных градиентов).
// ---------------------------------------------------------------------------

export const PlayerAvatar: React.FC<{ participant: ArenaParticipant; className?: string }> = ({ participant, className = 'w-10 h-10' }) => {
  const name = participant.username || participant.firstName || 'Player';
  return (
    <img
      src={participant.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.firstName || name}`}
      alt=""
      className={`${className} rounded-full bg-white/5 shrink-0 object-cover border border-white/10`}
    />
  );
};

// ---------------------------------------------------------------------------
// NFT/предмет в ставке
// ---------------------------------------------------------------------------

export const ArenaGiftChip: React.FC<{ gift: NonNullable<ArenaParticipant['gift']>; size?: 'sm' | 'md' }> = ({ gift, size = 'sm' }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/[0.12] ${size === 'sm' ? 'pl-1 pr-2 py-0.5' : 'pl-1.5 pr-3 py-1'} max-w-full`}>
    <PremiumImage
      staticMode
      src={gift.image_url || gift.lottie_url}
      alt={gift.name || 'NFT'}
      className={`${size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'} rounded-full bg-black/40 overflow-hidden shrink-0`}
    />
    <span className="truncate text-[11px] font-semibold text-white/80">{gift.name || 'NFT'}</span>
  </span>
);

// ---------------------------------------------------------------------------
// Чип статуса раунда
// ---------------------------------------------------------------------------

export const STATUS_CHIP: Record<ArenaStatus, string> = {
  WAITING: 'bg-white/[0.07] text-white/60 border-white/[0.14]',
  ACCEPTING_BETS: 'bg-[#0098ea]/15 text-[#4fc3ff] border-[#0098ea]/40 shadow-[0_0_14px_rgba(0,152,234,0.25)]',
  LOCKED: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  DRAWING: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40 shadow-[0_0_16px_rgba(34,211,238,0.3)]',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  CANCELLED: 'bg-red-500/15 text-red-400 border-red-500/40',
  ERROR: 'bg-red-500/15 text-red-400 border-red-500/40',
};

export const ArenaStatusChip: React.FC<{ status: ArenaStatus; label: string }> = ({ status, label }) => (
  <span className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold tracking-wider uppercase ${STATUS_CHIP[status]}`}>
    {label}
  </span>
);
