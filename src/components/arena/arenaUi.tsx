/*
  Мелкие переиспользуемые элементы UI AICE ARENA.
  Визуальный язык Rocket: тёмные карточки, тонкие светлые границы,
  большие скругления, cyan/blue акцент, мягкое свечение.
*/

import React from 'react';
import { PremiumImage } from '../PremiumImage';
import type { ArenaParticipant, ArenaStatus } from '../../lib/arenaShared';

// ---------------------------------------------------------------------------
// Аватар: фото или инициалы на градиентном круге
// ---------------------------------------------------------------------------

const AVATAR_HUES = [
  'from-cyan-500/70 to-blue-600/70',
  'from-violet-500/70 to-fuchsia-600/70',
  'from-emerald-500/70 to-teal-600/70',
  'from-amber-500/70 to-orange-600/70',
  'from-rose-500/70 to-pink-600/70',
];

export const ArenaAvatar: React.FC<{ participant: ArenaParticipant; className?: string }> = ({ participant, className = 'w-12 h-12' }) => {
  const name = participant.username || participant.firstName || '?';
  const hueIdx = Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_HUES.length;
  const initials = (participant.firstName || participant.username || '?').slice(0, 1).toUpperCase();

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden border border-white/15 bg-gradient-to-br ${AVATAR_HUES[hueIdx]} ${className}`}>
      {participant.avatar ? (
        <img src={participant.avatar} alt={name} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="font-display font-bold text-white/90" style={{ fontSize: '40%' }}>{initials}</span>
      )}
    </span>
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
