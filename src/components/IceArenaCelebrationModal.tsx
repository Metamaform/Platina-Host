import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Hash, Sparkles, Trophy, Users, X } from 'lucide-react';
import { GramIcon } from './GramIcon';
import { PremiumImage } from './PremiumImage';

export interface IceArenaCelebrationWinner {
  id: string;
  firstName?: string;
  username?: string;
  avatar?: string;
  photoUrl?: string;
  color?: string;
  percentage?: number;
}

interface IceArenaCelebrationModalProps {
  isOpen: boolean;
  winner: IceArenaCelebrationWinner | null;
  amount: number;
  gifts?: any[];
  variant?: 'round-win' | 'top-game';
  roundId?: number;
  participantsCount?: number;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];
const CONFETTI = Array.from({ length: 34 }, (_, index) => ({
  left: `${(index * 47 + 11) % 100}%`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  duration: 2.8 + (index % 5) * 0.32,
  delay: (index % 9) * 0.13,
  rotate: index % 2 === 0 ? 360 : -360,
  width: 5 + (index % 5),
  height: 8 + (index % 7),
  round: index % 3 === 0,
}));

export const IceArenaCelebrationModal: React.FC<IceArenaCelebrationModalProps> = ({
  isOpen,
  winner,
  amount,
  gifts = [],
  variant = 'round-win',
  roundId,
  participantsCount,
  onClose,
}) => {
  const isTopGame = variant === 'top-game';
  const winnerName = winner?.firstName || winner?.username || 'Игрок';
  const winnerColor = winner?.color || '#f59e0b';
  const avatar = winner?.avatar || winner?.photoUrl;

  return (
    <AnimatePresence>
      {isOpen && winner && (
        <motion.div
          key={isTopGame ? 'top-game-celebration' : 'round-win-celebration'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isTopGame ? onClose : undefined}
          className="fixed inset-0 z-[130] flex items-center justify-center overflow-hidden bg-black/85 backdrop-blur-md px-5 py-6"
          role="presentation"
        >
          {/* Confetti is deterministic so it does not jump on a rerender. */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {CONFETTI.map((piece, index) => (
              <motion.span
                key={index}
                initial={{ y: -24, rotate: 0, opacity: 1 }}
                animate={{ y: '105vh', rotate: piece.rotate, opacity: [1, 1, 0] }}
                transition={{ duration: piece.duration, repeat: Infinity, delay: piece.delay, ease: 'linear' }}
                style={{
                  left: piece.left,
                  top: -20,
                  backgroundColor: piece.color,
                  width: piece.width,
                  height: piece.height,
                  borderRadius: piece.round ? '50%' : 3,
                }}
                className="absolute"
              />
            ))}
          </div>

          <motion.section
            initial={{ scale: 0.86, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 25 }}
            onClick={(event) => event.stopPropagation()}
            className="relative z-10 w-full max-w-[360px] overflow-hidden rounded-[30px] border border-emerald-300/25 bg-[linear-gradient(160deg,rgba(19,55,42,0.98),rgba(15,20,24,0.98)_58%)] p-5 text-center shadow-[0_0_70px_rgba(16,185,129,0.20),0_30px_80px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.13)]"
            role="dialog"
            aria-modal="true"
            aria-label={isTopGame ? 'Топ игра за 24 часа' : 'Результат Ice Arena'}
          >
            <span aria-hidden="true" className="pointer-events-none absolute -top-16 left-1/2 h-36 w-64 -translate-x-1/2 rounded-full bg-emerald-300/25 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.10),transparent_38%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent" />

            {isTopGame && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/65 transition hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="relative z-10 mx-auto mb-3 flex h-[84px] w-[84px] items-center justify-center">
              <span className="absolute inset-0 rounded-[28px] bg-emerald-400/20 blur-xl" />
              <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-[25px] border border-amber-200/35 bg-gradient-to-b from-amber-300/20 via-emerald-500/15 to-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_28px_rgba(0,0,0,0.28)]">
                {isTopGame ? (
                  <Trophy className="h-10 w-10 text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.65)]" />
                ) : (
                  <Crown className="h-10 w-10 text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.65)]" />
                )}
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#153326] bg-emerald-400 text-[#072116] shadow-lg">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <div className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/[0.10] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.12)]">
              <Sparkles className="h-3 w-3 text-amber-300" />
              {isTopGame ? 'Лучшая игра за 24 часа' : 'Результат раунда'}
            </div>

            <div className="relative z-10 mt-3 flex flex-col items-center">
              <div className="relative mb-2.5">
                <span style={{ backgroundColor: winnerColor }} className="absolute -inset-2 rounded-full opacity-45 blur-xl" />
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    className="relative h-[76px] w-[76px] rounded-full border-[3px] border-amber-200/75 object-cover shadow-[0_0_24px_rgba(251,191,36,0.26)]"
                  />
                ) : (
                  <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-amber-200/75 bg-white/10 text-xl font-black text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.26)]">
                    {winnerName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Победитель</span>
              <h2 className="mt-0.5 max-w-full truncate font-display text-[23px] font-black tracking-tight text-white drop-shadow-sm">
                {winnerName}
              </h2>
            </div>

            <div className="relative z-10 mt-3 rounded-[22px] border border-amber-200/15 bg-black/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                {isTopGame ? 'Банк лучшей игры' : 'Выигрыш'}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5 font-display text-[32px] font-black leading-none text-amber-200 drop-shadow-[0_0_18px_rgba(251,191,36,0.22)]">
                <span>+{Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}</span>
                <GramIcon className="h-6 w-6 text-amber-300" />
              </div>
            </div>

            {isTopGame && (
              <div className="relative z-10 mt-2.5 grid grid-cols-2 gap-2">
                {roundId != null && (
                  <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-[10px] font-bold text-white/65">
                    <Hash className="h-3 w-3 shrink-0 text-amber-300" />
                    <span className="truncate">Раунд #{roundId}</span>
                  </div>
                )}
                {participantsCount != null && (
                  <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-[10px] font-bold text-white/65">
                    <Users className="h-3 w-3 shrink-0 text-emerald-300" />
                    <span>{participantsCount} игроков</span>
                  </div>
                )}
                {Number(winner.percentage) > 0 && (
                  <div className="col-span-2 flex items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-[10px] font-bold text-white/65">
                    Шанс победителя: <span className="text-emerald-200">{Number(winner.percentage).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}

            {gifts.length > 0 && (
              <div className="relative z-10 mt-3 flex items-center justify-center gap-2">
                {gifts.slice(0, 2).map((gift, index) => (
                  <div key={gift?.uniqueId || gift?.id || index} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] p-1.5 shadow-lg">
                    <PremiumImage src={gift?.image_url} alt={gift?.name || ''} className="h-full w-full object-contain" staticMode />
                  </div>
                ))}
                {gifts.length > 2 && (
                  <div className="flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] px-3 text-xs font-black text-white shadow-lg">
                    +{gifts.length - 2}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="relative z-10 mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-300 via-lime-300 to-emerald-300 py-3.5 font-display text-[15px] font-black text-[#10251a] shadow-[0_6px_24px_rgba(52,211,153,0.22)] transition hover:brightness-105 active:scale-[0.98]"
            >
              {isTopGame ? 'Закрыть' : 'Продолжить'}
            </button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
