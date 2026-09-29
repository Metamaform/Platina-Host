/*
  Мелкие переиспользуемые элементы UI AICE ARENA.
  Визуальный язык Rocket: тёмные карточки, тонкие светлые границы,
  большие скругления, cyan/blue акцент, мягкое свечение.
*/

import React from 'react';
import { Crown } from 'lucide-react';
import { PremiumImage } from '../PremiumImage';
import type { ArenaParticipant, ArenaStatus } from '../../lib/arenaShared';

// ---------------------------------------------------------------------------
// Карточка (тёмная, скруглённая, тонкая светлая граница + блик сверху)
// ---------------------------------------------------------------------------

export const ARENA_CARD =
  'relative bg-white/[0.05] border border-white/[0.10] rounded-[24px] ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_34px_-18px_rgba(0,0,0,0.9)]';

export function CardSheen() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
    />
  );
}

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

// ---------------------------------------------------------------------------
// Номер позиции / корона победителя
// ---------------------------------------------------------------------------

export const PositionBadge: React.FC<{ index: number }> = ({ index }) => (
  <span className="absolute top-2.5 left-2.5 z-10 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-black/50 border border-white/[0.14] text-[10px] font-bold text-white/70 backdrop-blur-sm">
    #{index + 1}
  </span>
);

export const WinnerCrown: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-200/60 shadow-[0_0_18px_rgba(251,191,36,0.6)] ${className}`}>
    <Crown className="w-3.5 h-3.5 text-black/80" strokeWidth={2.6} />
  </span>
);
