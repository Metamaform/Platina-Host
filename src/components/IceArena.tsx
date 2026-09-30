import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, X, Trophy, Sparkles,
  Plus, Dices, ArrowUpRight, ChevronRight
} from 'lucide-react';
import { GramIcon } from './GramIcon';
import { cleanNftName, getNftBackdrop } from '../lib/nftUtils';
import { NftSelectorGrid } from './NftSelectorGrid';
import { LiquidSegment } from './ui/LiquidSegment';
import { PremiumImage } from './PremiumImage';
import { useTranslation } from '../lib/i18n';
import {
  computeIceArenaTerritories,
  samplePointInIceArenaTerritory,
} from '../lib/iceArenaTerritories';

export interface IceArenaProps {
  onBack: () => void;
  inventory?: any[];
  setInventory?: (inv: any[]) => void;
  balance?: number;
  setBalance?: (b: number | ((prev: number) => number)) => void;
  onTurnover?: (amt: number) => void;
  onWin?: (amt: number, mode: 'gram' | 'nft', item?: any, mult?: number) => void;
  giftsDb?: any[];
  user?: any;
  token?: string | null;
}

export interface ArenaParticipant {
  id: string;
  userId: number;
  username?: string;
  firstName?: string;
  avatar?: string;
  photoUrl?: string;
  betAmount: number;
  gift?: any;
  gifts?: any[];
  isNft?: boolean;
  contribution: number;
  percentage: number;
  isUser?: boolean;
  color: string;
}

export interface CompletedRoundRecord {
  id: number;
  totalPool: number;
  winner: ArenaParticipant;
  participantsCount: number;
  giftsCount: number;
  completedAt: number;
  participants?: ArenaParticipant[];
  gifts?: any[];
}

export function getGiftBackdropType(g: any): 'black' | 'onyx' | 'default' {
  if (!g) return 'default';
  const bd = String(g.backdrop || '').toLowerCase();
  const name = String(g.name || '').toLowerCase();
  const id = String(g.id || '').toLowerCase();

  if (bd.includes('onyx') || name.includes('onyx') || id.includes('_onyx')) {
    return 'onyx';
  }
  if (bd.includes('black') || name.includes('(black)') || name.includes(' black') || id.endsWith('_black') || id.includes('_black_')) {
    return 'black';
  }
  return 'default';
}

const DEFAULT_HISTORY: CompletedRoundRecord[] = [
  {
    id: 449084,
    totalPool: 184.50,
    winner: {
      id: 'h_1',
      userId: 101,
      firstName: 'Артем',
      username: 'artem_ton',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      betAmount: 75.00,
      contribution: 75.00,
      percentage: 40.7,
      color: '#10b981',
    },
    participantsCount: 4,
    giftsCount: 2,
    completedAt: Date.now() - 1000 * 60 * 12,
    participants: [
      { id: 'h_1', userId: 101, firstName: 'Артем', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', betAmount: 75, contribution: 75, percentage: 40.7, color: '#10b981' },
      { id: 'h_2', userId: 102, firstName: 'Elena', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', betAmount: 45, contribution: 45, percentage: 24.4, color: '#06b6d4' },
      { id: 'h_3', userId: 103, firstName: 'Dmitry', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', betAmount: 38, contribution: 38, percentage: 20.6, color: '#f59e0b' },
      { id: 'h_4', userId: 104, firstName: 'Sofi', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', betAmount: 26.5, contribution: 26.5, percentage: 14.3, color: '#ec4899' },
    ],
    gifts: [
      {
        id: "45_black",
        name: "Durov’s Caps (Black)",
        image_url: "https://fragment.com/file/gifts/durovscap/model.tUx9OQD76zRCUJvZus_PPYlsUWIr5bvXUEpBMMEwyjtCbV54nssQ3Ppd_2b7xMCE.webp",
        backdrop: "Black",
        price: 110.0,
        floor_price_gram: 110.0,
      },
      {
        id: "45_onyx",
        name: "Durov’s Caps (Onyx Black)",
        image_url: "https://fragment.com/file/gifts/durovscap/model.tUx9OQD76zRCUJvZus_PPYlsUWIr5bvXUEpBMMEwyjtCbV54nssQ3Ppd_2b7xMCE.webp",
        backdrop: "Onyx Black",
        price: 74.5,
        floor_price_gram: 74.5,
      },
    ],
  },
  {
    id: 449083,
    totalPool: 62.40,
    winner: {
      id: 'h_5',
      userId: 105,
      firstName: 'Max',
      username: 'max_crypto',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      betAmount: 28.00,
      contribution: 28.00,
      percentage: 44.9,
      color: '#3b82f6',
    },
    participantsCount: 3,
    giftsCount: 1,
    completedAt: Date.now() - 1000 * 60 * 35,
    participants: [
      { id: 'h_5', userId: 105, firstName: 'Max', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', betAmount: 28, contribution: 28, percentage: 44.9, color: '#3b82f6' },
      { id: 'h_6', userId: 106, firstName: 'kesha', avatar: 'https://images.unsplash.com/photo-1544499980-2680ced6993a?w=150&auto=format&fit=crop&q=80', betAmount: 18.4, contribution: 18.4, percentage: 29.5, color: '#10b981' },
      { id: 'h_7', userId: 107, firstName: 'AV', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', betAmount: 16, contribution: 16, percentage: 25.6, color: '#06b6d4' },
    ],
  },
  {
    id: 449082,
    totalPool: 94.10,
    winner: {
      id: 'h_8',
      userId: 108,
      firstName: 'Polaris',
      username: 'polaris_star',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      betAmount: 52.00,
      contribution: 52.00,
      percentage: 55.3,
      color: '#ec4899',
    },
    participantsCount: 4,
    giftsCount: 3,
    completedAt: Date.now() - 1000 * 60 * 65,
    participants: [
      { id: 'h_8', userId: 108, firstName: 'Polaris', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', betAmount: 52, contribution: 52, percentage: 55.3, color: '#ec4899' },
      { id: 'h_9', userId: 109, firstName: 'Давид', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', betAmount: 22, contribution: 22, percentage: 23.4, color: '#f59e0b' },
      { id: 'h_10', userId: 110, firstName: 'Ivan', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', betAmount: 12.1, contribution: 12.1, percentage: 12.8, color: '#8b5cf6' },
      { id: 'h_11', userId: 111, firstName: 'Anna', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', betAmount: 8, contribution: 8, percentage: 8.5, color: '#06b6d4' },
    ],
  },
];

const PLAYER_COLORS = [
  '#10b981', // Emerald Green (like kesha)
  '#06b6d4', // Cyan/Teal (like AV)
  '#f59e0b', // Amber/Orange (like ДА)
  '#ec4899', // Vivid Rose/Purple (like anime avatar)
  '#3b82f6', // Royal Blue
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#14b8a6', // Teal
];

// Presets from the video demo
const SAMPLE_PLAYERS = [
  { 
    name: 'kesha', 
    avatar: 'https://images.unsplash.com/photo-1544499980-2680ced6993a?w=150&auto=format&fit=crop&q=80', 
    bet: 4.26, 
    color: '#10b981' 
  },
  { 
    name: 'AV', 
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 
    bet: 4.78, 
    color: '#06b6d4' 
  },
  { 
    name: 'Polaris', 
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 
    bet: 4.22, 
    color: '#ec4899' 
  },
  { 
    name: 'Давид', 
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 
    bet: 3.85, 
    color: '#f59e0b' 
  },
];

/*
  ==============================================================================
  NFT PRIZE CARD (Renders won gifts with Black / Onyx Black theme)
  ==============================================================================
*/
interface NftPrizeCardProps {
  gift: any;
  compact?: boolean;
}

const NftPrizeCard: React.FC<NftPrizeCardProps> = ({ gift, compact = false }) => {
  const backdrop = getNftBackdrop(gift);
  const isBlack = backdrop === 'Black';
  const isOnyx = backdrop === 'Onyx Black';
  const isDark = isBlack || isOnyx;

  const price = Number(gift.floor_price_gram || gift.price || 0);
  const name = cleanNftName(gift.baseName || gift.name);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl flex flex-col items-center transition-all duration-300 ${
        isBlack
          ? 'bg-[radial-gradient(circle_at_50%_35%,#2c2d30_0%,#09090b_100%)] border border-white/20 shadow-[0_4px_22px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-white/10'
          : isOnyx
          ? 'bg-[radial-gradient(circle_at_50%_35%,#3a3f42_0%,#131517_100%)] border border-white/20 shadow-[0_4px_22px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-white/10'
          : 'bg-white/[0.05] border border-white/10 shadow-lg'
      } ${compact ? 'p-2' : 'p-3 w-full'}`}
    >
      {/* Black / Onyx Black Pill Badge */}
      {isDark && (
        <div className="mb-1 flex items-center justify-center">
          <span
            className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm ${
              isOnyx
                ? 'text-zinc-200 bg-[#35393a]/90 border border-white/15'
                : 'text-zinc-300 bg-black/90 border border-white/15'
            }`}
          >
            {isOnyx ? 'Onyx Black' : 'Black'}
          </span>
        </div>
      )}

      {/* Gift Image */}
      <div className={`relative flex items-center justify-center ${compact ? 'w-12 h-12 mb-1' : 'w-16 h-16 mb-1'}`}>
        {isDark && (
          <div className="absolute inset-0 rounded-full bg-white/5 blur-md pointer-events-none" />
        )}
        <PremiumImage
          src={gift.image_url}
          alt={name}
          className="w-full h-full object-contain drop-shadow-md"
          staticMode={false}
          loopWithDelay={true}
          loopDelayMs={4000}
        />
      </div>

      {/* Gift Name */}
      <span className="text-white text-[11px] font-bold truncate max-w-[120px] leading-tight">
        {name}
      </span>

      {/* Price in GRAM */}
      {price > 0 && (
        <div className="flex items-center gap-1 mt-0.5 text-[11px] font-extrabold text-brand tabular-nums">
          <span>{price.toFixed(1)}</span>
          <GramIcon className="w-3 h-3 text-brand" />
        </div>
      )}
    </div>
  );
};

/*
  ==============================================================================
  CELEBRATION MODAL (Restored previous clean interface for Winner & Top Game 24h)
  ==============================================================================
*/
interface IceArenaCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTopGame?: boolean;
  roundId: number;
  winner: ArenaParticipant;
  totalPool: number;
  gifts?: any[];
  onContinue?: () => void;
}

const IceArenaCelebrationModal: React.FC<IceArenaCelebrationModalProps> = ({
  isOpen,
  onClose,
  isTopGame = false,
  roundId,
  winner,
  totalPool,
  gifts = [],
  onContinue,
}) => {
  if (!isOpen || !winner) return null;

  const sortedGifts = [...gifts].sort(
    (a, b) => Number(b.floor_price_gram || b.price || 0) - Number(a.floor_price_gram || a.price || 0)
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md px-6 select-none cursor-pointer"
      onClick={onClose}
    >
      {/* Confetti / Fireworks (Хлопушка) particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: `${Math.random() * 100}vw`, 
              y: -25, 
              rotate: 0, 
              opacity: 1 
            }}
            animate={{ 
              y: '105vh', 
              rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
              opacity: [1, 1, 0] 
            }}
            transition={{ 
              duration: 2.4 + Math.random() * 2, 
              repeat: Infinity,
              delay: Math.random() * 1.5,
              ease: "linear"
            }}
            style={{
              backgroundColor: ['#10b981', '#84cc16', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#eab308'][i % 7],
              width: `${6 + (i % 6)}px`,
              height: `${10 + (i % 8)}px`,
              borderRadius: i % 2 === 0 ? '2px' : '50%',
            }}
            className="absolute"
          />
        ))}
      </div>

      {/* Winner Card Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm flex flex-col items-center text-center p-6 cursor-default"
      >
        {/* Close Button in top right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer z-20"
          title="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Winner Avatar with Glowing Halo */}
        <div className="relative mb-3">
          <div 
            style={{ backgroundColor: winner.color || (isTopGame ? '#f59e0b' : '#10b981') }} 
            className="absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse" 
          />
          <img
            src={winner.avatar || winner.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Winner'}
            alt={winner.firstName || 'Победитель'}
            className="relative z-10 w-20 h-20 rounded-full object-cover border-4 border-white/20 shadow-2xl"
          />
        </div>

        <span className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-0.5">
          {isTopGame ? `Топ игра 24ч • Раунд #${roundId}` : 'Победитель'}
        </span>

        <h2 className="text-2xl font-display font-black text-white mb-2">
          {winner.firstName || winner.username || 'Победитель'}
        </h2>

        {/* Total Winnings Headline */}
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-baseline gap-1.5 text-3xl sm:text-4xl font-display font-black text-amber-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
            <span>+{totalPool.toFixed(2)}</span>
            <span className="text-xl font-bold text-amber-300/90">GRAM</span>
          </div>
        </div>

        {/* Pure NFT row: чисто нфт и с фоном блек или оникс */}
        {sortedGifts.length > 0 && (
          <div className="flex items-center justify-center flex-wrap gap-2.5 mb-6">
            {sortedGifts.slice(0, 4).map((g, i) => {
              const bd = getNftBackdrop(g);
              const isBlack = bd === 'Black';
              const isOnyx = bd === 'Onyx Black';
              return (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-2xl p-2 flex items-center justify-center shrink-0 border transition-all ${
                    isBlack
                      ? 'bg-[radial-gradient(circle,#282a2b_0%,#191919_100%)] border-white/30 shadow-[0_0_12px_rgba(0,0,0,0.85)]'
                      : isOnyx
                      ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/30 shadow-[0_0_12px_rgba(0,0,0,0.75)]'
                      : 'bg-white/10 border-white/15 backdrop-blur-md shadow-lg'
                  }`}
                  title={`${g.name}${bd !== 'Default' ? ` (${bd})` : ''}`}
                >
                  <PremiumImage
                    src={g.image_url}
                    alt={g.name}
                    className="w-full h-full object-contain"
                    staticMode={true}
                  />
                </div>
              );
            })}

            {sortedGifts.length > 4 && (
              <div className="h-14 px-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-white font-display font-black text-sm shrink-0 shadow-lg">
                +{sortedGifts.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Green Button: «Продолжить» / «Закрыть» */}
        <button
          onClick={() => {
            if (onContinue) onContinue();
            else onClose();
          }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#84cc16] via-[#a3e635] to-[#84cc16] hover:brightness-105 active:scale-95 transition-all text-black font-display font-black text-lg shadow-[0_4px_22px_rgba(132,204,22,0.4)] cursor-pointer"
        >
          {isTopGame ? 'Закрыть' : 'Продолжить'}
        </button>
      </motion.div>
    </div>
  );
};

export const IceArena: React.FC<IceArenaProps> = ({
  onBack,
  inventory = [],
  setInventory,
  balance = 0,
  setBalance,
  onTurnover,
  onWin,
  user,
  token,
}) => {
  const { t } = useTranslation();

  // Tabs: 'game' (Текущая игра) | 'history' (История)
  const [activeTab, setActiveTab] = useState<'game' | 'history'>('game');

  // Round State
  const [roundId, setRoundId] = useState<number>(449085);
  const [roundStatus, setRoundStatus] = useState<'waiting' | 'betting' | 'drawing' | 'completed'>('betting');
  const [countdown, setCountdown] = useState<number>(30);
  const [participants, setParticipants] = useState<ArenaParticipant[]>([]);
  const [winner, setWinner] = useState<ArenaParticipant | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [showTopGameModal, setShowTopGameModal] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<CompletedRoundRecord[]>(DEFAULT_HISTORY);
  const [selectedHistoryRound, setSelectedHistoryRound] = useState<CompletedRoundRecord | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [territoryMapElement, setTerritoryMapElement] = useState<HTMLDivElement | null>(null);
  const [territoryMapSize, setTerritoryMapSize] = useState({ width: 360, height: 270 });
  const [landPulse, setLandPulse] = useState<number>(0);

  useEffect(() => {
    const element = territoryMapElement;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setTerritoryMapSize((previous) => (
        Math.abs(previous.width - rect.width) < 0.5 && Math.abs(previous.height - rect.height) < 0.5
          ? previous
          : { width: rect.width, height: rect.height }
      ));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [territoryMapElement]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Load server history on mount if available
  useEffect(() => {
    let alive = true;
    fetch('/api/arena/history?limit=30')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!alive || !d || !Array.isArray(d.history) || d.history.length === 0) return;
        const mapped: CompletedRoundRecord[] = d.history.map((h: any) => ({
          id: h.id,
          totalPool: Number(h.totalPool || 0),
          winner: h.winner ? {
            id: String(h.winner.userId || h.winner.id || 'w'),
            userId: h.winner.userId || 0,
            firstName: h.winner.firstName || h.winner.username || 'Победитель',
            username: h.winner.username || '',
            avatar: h.winner.avatar || '',
            betAmount: Number(h.winner.contribution || 0),
            contribution: Number(h.winner.contribution || 0),
            percentage: Number(h.winner.percentage || 0),
            color: '#10b981',
          } : { id: 'w', userId: 0, firstName: 'Победитель', betAmount: 0, contribution: 0, percentage: 0, color: '#10b981' },
          participantsCount: h.participantsCount || (h.participants ? h.participants.length : 1),
          giftsCount: h.participants ? h.participants.filter((p: any) => !!p.gift).length : 0,
          completedAt: Number(h.completedAt) || Date.now(),
          participants: h.participants ? h.participants.map((p: any) => ({
            id: String(p.userId || p.id),
            userId: p.userId || 0,
            firstName: p.firstName || p.username || 'Игрок',
            avatar: p.avatar || '',
            betAmount: Number(p.betAmount || p.contribution || 0),
            contribution: Number(p.contribution || p.betAmount || 0),
            percentage: Number(p.percentage || 0),
            gift: p.gift,
            gifts: p.gift ? [p.gift] : [],
            color: '#06b6d4',
          })) : undefined,
        }));
        setHistoryList(mapped);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Лучший банк среди завершённых раундов за последние 24 часа.
  const topGame = useMemo(() => {
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentRounds = historyList.filter((round) => (
      Number.isFinite(round.completedAt) && round.completedAt >= dayAgo && round.completedAt <= now + 5 * 60 * 1000
    ));
    if (recentRounds.length === 0) return null;

    const record = recentRounds.reduce((best, round) => (
      round.totalPool > best.totalPool || (round.totalPool === best.totalPool && round.completedAt > best.completedAt)
        ? round
        : best
    ));

    return {
      pool: record.totalPool,
      winnerName: record.winner.firstName || record.winner.username || 'Победитель',
      record,
    };
  }, [historyList, now]);

  // Bouncing Ball position during drawing
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const [isBallActive, setIsBallActive] = useState<boolean>(false);

  // Betting Modal State (exact interface from Rocket)
  const [showBetModal, setShowBetModal] = useState<boolean>(false);
  const [mode, setMode] = useState<string>('gram');
  const [betInput, setBetInput] = useState<string>('5');
  const [selectedNfts, setSelectedNfts] = useState<any[]>([]);

  const totalNftBetValue = useMemo(() => {
    return selectedNfts.reduce((sum, item) => {
      return sum + Number(item.floor_price_gram || item.price || 5);
    }, 0);
  }, [selectedNfts]);

  const handleToggleNft = useCallback((item: any) => {
    const uid = item.uniqueId || item.id;
    setSelectedNfts(prev => {
      const exists = prev.some(n => (n.uniqueId || n.id) === uid);
      if (exists) {
        return prev.filter(n => (n.uniqueId || n.id) !== uid);
      } else {
        return [...prev, item];
      }
    });
  }, []);
  const [isSubmittingBet, setIsSubmittingBet] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sound Synth
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playSound = useCallback((type: 'tick' | 'win' | 'bet' | 'bounce') => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(540, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'bounce') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(700 + Math.random() * 200, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'bet') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.setValueAtTime(freq, now + i * 0.09);
          g.gain.setValueAtTime(0.12, now + i * 0.09);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.35);
          o.start(now + i * 0.09);
          o.stop(now + i * 0.09 + 0.35);
        });
      }
    } catch {}
  }, []);

  // Compute Total Bank
  const totalPool = useMemo(() => {
    return participants.reduce((acc, p) => acc + p.contribution, 0);
  }, [participants]);

  // Recalculate percentage for all players
  const normalizedParticipants = useMemo(() => {
    if (totalPool <= 0) {
      return participants.map((p, idx) => ({
        ...p,
        color: p.color || PLAYER_COLORS[idx % PLAYER_COLORS.length],
        percentage: participants.length > 0 ? Number((100 / participants.length).toFixed(2)) : 0,
      }));
    }
    return participants.map((p, idx) => ({
      ...p,
      color: p.color || PLAYER_COLORS[idx % PLAYER_COLORS.length],
      percentage: Number(((p.contribution / totalPool) * 100).toFixed(2)),
    }));
  }, [participants, totalPool]);

  // Territory tiling follows the actual map aspect ratio, not a hard-coded device size.
  const territoryNodes = useMemo(() => (
    computeIceArenaTerritories(normalizedParticipants, territoryMapSize)
  ), [normalizedParticipants, territoryMapSize]);

  // Check if current user has placed a bet
  const userBet = useMemo(() => {
    return normalizedParticipants.find(p => p.isUser);
  }, [normalizedParticipants]);

  // Collect all gifts wagered in current round
  const roundGifts = useMemo(() => {
    const list: any[] = [];
    participants.forEach(p => {
      if (p.gifts && p.gifts.length > 0) {
        list.push(...p.gifts);
      } else if (p.gift) {
        list.push(p.gift);
      }
    });
    return list;
  }, [participants]);

  // Sorted gifts by price descending for winner display (top 2 most expensive)
  const sortedRoundGifts = useMemo(() => {
    return [...roundGifts].sort((a, b) => {
      const pA = Number(a.floor_price_gram || a.price || 0);
      const pB = Number(b.floor_price_gram || b.price || 0);
      return pB - pA;
    });
  }, [roundGifts]);

  // Seed sample round like in the video
  const initSampleRound = useCallback((roundNum: number) => {
    setRoundId(roundNum);
    setRoundStatus('betting');
    setCountdown(30);
    setWinner(null);
    setShowWinnerModal(false);
    setShowTopGameModal(false);
    setIsBallActive(false);
    setBallPos(null);
    setLandPulse(0);

    // Initial player (kesha with 4.26 G)
    const p1: ArenaParticipant = {
      id: `p_1_${Date.now()}`,
      userId: 101,
      firstName: SAMPLE_PLAYERS[0].name,
      username: SAMPLE_PLAYERS[0].name,
      avatar: SAMPLE_PLAYERS[0].avatar,
      photoUrl: SAMPLE_PLAYERS[0].avatar,
      betAmount: SAMPLE_PLAYERS[0].bet,
      contribution: SAMPLE_PLAYERS[0].bet,
      percentage: 100,
      color: SAMPLE_PLAYERS[0].color,
    };
    setParticipants([p1]);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initSampleRound(449085);
  }, [initSampleRound]);

  // Staggered addition of players during the 30s countdown (matching the video)
  useEffect(() => {
    if (roundStatus !== 'betting') return;

    // Player 2 joins at countdown 28s
    const t1 = setTimeout(() => {
      setParticipants(prev => {
        if (prev.some(p => p.firstName === SAMPLE_PLAYERS[1].name)) return prev;
        const p2: ArenaParticipant = {
          id: `p_2_${Date.now()}`,
          userId: 102,
          firstName: SAMPLE_PLAYERS[1].name,
          username: SAMPLE_PLAYERS[1].name,
          avatar: SAMPLE_PLAYERS[1].avatar,
          photoUrl: SAMPLE_PLAYERS[1].avatar,
          betAmount: SAMPLE_PLAYERS[1].bet,
          contribution: SAMPLE_PLAYERS[1].bet,
          percentage: 0,
          color: SAMPLE_PLAYERS[1].color,
        };
        playSound('bet');
        return [...prev, p2];
      });
    }, 2000);

    // Player 3 joins at countdown 23s
    const t2 = setTimeout(() => {
      setParticipants(prev => {
        if (prev.some(p => p.firstName === SAMPLE_PLAYERS[2].name)) return prev;
        const blackGift = {
          id: "45_black",
          name: "Durov’s Caps (Black)",
          image_url: "https://fragment.com/file/gifts/durovscap/model.tUx9OQD76zRCUJvZus_PPYlsUWIr5bvXUEpBMMEwyjtCbV54nssQ3Ppd_2b7xMCE.webp",
          backdrop: "Black",
          price: 4.22,
          floor_price_gram: 4.22,
        };
        const p3: ArenaParticipant = {
          id: `p_3_${Date.now()}`,
          userId: 103,
          firstName: SAMPLE_PLAYERS[2].name,
          username: SAMPLE_PLAYERS[2].name,
          avatar: SAMPLE_PLAYERS[2].avatar,
          photoUrl: SAMPLE_PLAYERS[2].avatar,
          betAmount: SAMPLE_PLAYERS[2].bet,
          contribution: SAMPLE_PLAYERS[2].bet,
          percentage: 0,
          color: SAMPLE_PLAYERS[2].color,
          gift: blackGift,
          gifts: [blackGift],
          isNft: true,
        };
        playSound('bet');
        return [...prev, p3];
      });
    }, 7000);

    // Player 4 joins at countdown 18s
    const t3 = setTimeout(() => {
      setParticipants(prev => {
        if (prev.some(p => p.firstName === SAMPLE_PLAYERS[3].name)) return prev;
        const p4: ArenaParticipant = {
          id: `p_4_${Date.now()}`,
          userId: 104,
          firstName: SAMPLE_PLAYERS[3].name,
          username: SAMPLE_PLAYERS[3].name,
          avatar: SAMPLE_PLAYERS[3].avatar,
          photoUrl: SAMPLE_PLAYERS[3].avatar,
          betAmount: SAMPLE_PLAYERS[3].bet,
          contribution: SAMPLE_PLAYERS[3].bet,
          percentage: 0,
          color: SAMPLE_PLAYERS[3].color,
        };
        playSound('bet');
        return [...prev, p4];
      });
    }, 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [roundStatus, playSound]);

  // 30s Countdown timer
  useEffect(() => {
    if (roundStatus !== 'betting') return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setRoundStatus('drawing');
          return 0;
        }
        if (prev <= 5) playSound('tick');
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roundStatus, playSound]);

  // When Drawing starts -> smooth authentic ice glide into winner's sampled territory spot
  useEffect(() => {
    if (roundStatus !== 'drawing') return;

    // Pick winner based on contribution weights
    const pool = totalPool;
    const rand = Math.random() * pool;
    let running = 0;
    let chosen = normalizedParticipants[0] || null;
    for (const p of normalizedParticipants) {
      running += p.contribution;
      if (rand <= running) {
        chosen = p;
        break;
      }
    }
    setWinner(chosen);

    const winnerNode = territoryNodes.find(n => n.participant.id === chosen?.id) || territoryNodes[0];
    const destination = winnerNode ? samplePointInIceArenaTerritory(winnerNode) : { x: 50, y: 50 };

    setIsBallActive(true);
    setLandPulse(0);

    // Initial position: center with a slight random offset
    const startX = 50 + (Math.random() - 0.5) * 12;
    const startY = 50 + (Math.random() - 0.5) * 12;
    setBallPos({ x: startX, y: startY });

    // Smooth gliding curve with ice momentum
    const duration = 2400; // 2.4s: swift, smooth and engaging
    const startTime = performance.now();
    let animId: number;

    // Curved control point for realistic arc across ice
    const midX = (startX + destination.x) / 2 + (Math.random() - 0.5) * 28;
    const midY = (startY + destination.y) / 2 + (Math.random() - 0.5) * 28;

    const frameStep = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(1, elapsed / duration);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - t, 3);

      // Quadratic bezier glide
      const invEase = 1 - ease;
      const curX = invEase * invEase * startX + 2 * invEase * ease * midX + ease * ease * destination.x;
      const curY = invEase * invEase * startY + 2 * invEase * ease * midY + ease * ease * destination.y;

      setBallPos({ x: curX, y: curY });

      if (t < 1) {
        animId = requestAnimationFrame(frameStep);
      } else {
        setBallPos(destination);
        setIsBallActive(false);
        setLandPulse(Date.now());
        playSound('win');

        if (chosen?.isUser) {
          setBalance?.((prev: number) => Number((prev + pool).toFixed(2)));
          onWin?.(pool, 'gram', undefined, 1.0);
        }

        const record: CompletedRoundRecord = {
          id: roundId,
          totalPool: pool,
          winner: chosen!,
          participantsCount: normalizedParticipants.length,
          giftsCount: roundGifts.length,
          completedAt: Date.now(),
          participants: normalizedParticipants,
          gifts: roundGifts,
        };
        setHistoryList(prev => [record, ...prev.slice(0, 49)]);

        setTimeout(() => {
          setShowWinnerModal(true);
        }, 550);
      }
    };

    animId = requestAnimationFrame(frameStep);
    return () => cancelAnimationFrame(animId);
  }, [roundStatus, totalPool, normalizedParticipants, territoryNodes, roundGifts, roundId, playSound, setBalance, onWin]);

  // Handle Continue from Winner Screen
  const handleContinue = () => {
    setShowWinnerModal(false);
    setRoundStatus('waiting');
    // Start next round in 1.5 seconds
    setTimeout(() => {
      initSampleRound(roundId + 1);
    }, 1500);
  };

  // Handle Bet Input Change
  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '.');
    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setBetInput(val);
    }
  };

  const setBetAdd = (amt: number) => {
    const cur = parseFloat(betInput) || 0;
    const next = Math.min(Number((cur + amt).toFixed(2)), balance);
    setBetInput(next.toString());
  };

  const setBetMax = () => {
    setBetInput(balance.toFixed(2));
  };

  // Place Bet Logic
  const handlePlaceBet = async () => {
    if (isSubmittingBet) return;
    setActionError(null);

    let betValue = 0;
    let betGifts: any[] = [];

    if (mode === 'gram') {
      const parsed = parseFloat(betInput);
      if (isNaN(parsed) || parsed < 0.1) {
        setActionError('Минимальная ставка 0.1 GRAM');
        return;
      }
      if (parsed > balance) {
        setActionError('Недостаточно средств на балансе');
        return;
      }
      betValue = Number(parsed.toFixed(2));
    } else {
      if (selectedNfts.length === 0) {
        setActionError('Выберите хотя бы один подарок из инвентаря');
        return;
      }
      betGifts = [...selectedNfts];
      betValue = Number(totalNftBetValue.toFixed(2));
    }

    setIsSubmittingBet(true);

    try {
      if (token) {
        try {
          await fetch('/api/arena/bet', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              amount: mode === 'gram' ? betValue : 0,
              gift: betGifts[0] || null,
              gifts: betGifts,
            })
          });
        } catch {}
      }

      if (mode === 'gram') {
        setBalance?.(prev => Math.max(0, Number((prev - betValue).toFixed(2))));
        onTurnover?.(betValue);
      } else if (betGifts.length > 0 && setInventory) {
        const chosenIds = new Set(betGifts.map(g => g.uniqueId || g.id));
        setInventory(inventory.filter(i => !chosenIds.has(i.uniqueId || i.id)));
      }

      const newParticipant: ArenaParticipant = {
        id: `user_${Date.now()}`,
        userId: user?.id || 9999,
        firstName: user?.firstName || 'Вы',
        username: user?.username || 'you',
        avatar: user?.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=YouHero',
        photoUrl: user?.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=YouHero',
        betAmount: betValue,
        gift: betGifts[0] || null,
        gifts: betGifts,
        isNft: betGifts.length > 0,
        contribution: betValue,
        percentage: 0,
        isUser: true,
        color: '#00f0ff',
      };

      setParticipants(prev => {
        const existingIdx = prev.findIndex(p => p.isUser);
        let nextList: ArenaParticipant[];
        if (existingIdx >= 0) {
          const updated = [...prev];
          const cur = updated[existingIdx];
          const combinedGifts = [...(cur.gifts || (cur.gift ? [cur.gift] : [])), ...betGifts];
          updated[existingIdx] = {
            ...cur,
            contribution: Number((cur.contribution + betValue).toFixed(2)),
            betAmount: Number((cur.betAmount + betValue).toFixed(2)),
            gift: combinedGifts[0] || cur.gift,
            gifts: combinedGifts,
            isNft: combinedGifts.length > 0,
          };
          nextList = updated;
        } else {
          nextList = [newParticipant, ...prev];
        }

        const newPot = nextList.reduce((acc, p) => acc + p.contribution, 0);
        return nextList.map(p => ({
          ...p,
          percentage: Number(((p.contribution / newPot) * 100).toFixed(1)),
        }));
      });

      playSound('bet');
      setShowBetModal(false);
      setSelectedNfts([]);
    } catch (e: any) {
      setActionError(e.message || 'Ошибка ставки');
    } finally {
      setIsSubmittingBet(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0d0e12] text-white relative select-none">
      {/* 
        ========================================================================
        TOP HEADER: Back Button, Balance
        ========================================================================
      */}
      <div className="relative z-20 flex items-center justify-between px-4 h-14 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back') || 'Назад'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Баланс */}
          <div className="flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 px-3 py-1.5 rounded-full shadow-sm">
            <GramIcon className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-white font-bold text-xs tabular-nums">
              {balance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        TABS: «Текущая игра» | «История»
        ========================================================================
      */}
      <div className="px-4 mb-2.5">
        <div className="w-full flex rounded-2xl bg-white/[0.04] p-1 border border-white/[0.06]">
          <button
            onClick={() => setActiveTab('game')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'game'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Текущая игра
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            История
          </button>
        </div>
      </div>

      {/* 
        ========================================================================
        MAIN SCROLLABLE CONTENT
        ========================================================================
      */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 custom-scrollbar">
        <div className="max-w-md mx-auto flex flex-col items-center">

          {activeTab === 'history' ? (
            /* ==================================================================
               HISTORY TAB VIEW
               ================================================================== */
            <div className="w-full flex flex-col gap-2.5 pt-1 pb-8">
              <span className="text-white/60 text-xs font-semibold px-1 mb-1">
                История раундов
              </span>
              {historyList.length === 0 ? (
                <div className="w-full py-10 px-4 text-center rounded-[24px] bg-white/[0.04] border border-white/[0.08] text-white/40 text-sm">
                  История пока пуста. Завершите хотя бы одну игру!
                </div>
              ) : (
                historyList.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedHistoryRound(h)}
                    className="w-full text-left flex items-center justify-between rounded-[20px] p-3.5 bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.18] backdrop-blur-md transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={h.winner.avatar || h.winner.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Winner'}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-emerald-400/70 shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold text-sm truncate">
                            {h.winner.firstName || h.winner.username || 'Победитель'}
                          </span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                            Победитель
                          </span>
                          {(() => {
                            const rGifts = h.gifts || h.participants?.flatMap(p => p.gifts || (p.gift ? [p.gift] : [])) || [];
                            const hasDark = rGifts.some(g => {
                              const bd = getNftBackdrop(g);
                              return bd === 'Black' || bd === 'Onyx Black';
                            });
                            if (!hasDark) return null;
                            return (
                              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/90 text-zinc-300 border border-white/20 shrink-0">
                                Black
                              </span>
                            );
                          })()}
                        </div>
                        <span className="text-xs text-white/40 mt-0.5">
                          Раунд #{h.id} • {h.participantsCount} уч.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <div className="flex items-center gap-1 text-emerald-400 font-display font-black text-sm">
                        <span>+{h.totalPool.toFixed(2)}</span>
                        <GramIcon className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* ==================================================================
               CURRENT GAME VIEW
               ================================================================== */
            <>
              {/* Lightweight & simple Top Game banner */}
              <button
                type="button"
                disabled={!topGame}
                onClick={() => topGame && setShowTopGameModal(true)}
                className="w-full mb-3 flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-amber-400/40 hover:bg-white/[0.07] transition-all active:scale-[0.99] cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-amber-400/15 flex items-center justify-center text-amber-300 shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 text-xs font-semibold">
                    <span className="text-white/60 shrink-0">Топ игра 24ч:</span>
                    {topGame ? (
                      <>
                        <span className="text-amber-300 font-bold truncate">
                          {topGame.pool.toFixed(2)} GRAM
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/80 font-medium truncate">
                          {topGame.winnerName}
                        </span>
                        {(() => {
                          const tgGifts = topGame.record.gifts || topGame.record.participants?.flatMap(p => p.gifts || (p.gift ? [p.gift] : [])) || [];
                          const hasDark = tgGifts.some(g => {
                            const bd = getNftBackdrop(g);
                            return bd === 'Black' || bd === 'Onyx Black';
                          });
                          if (!hasDark) return null;
                          return (
                            <span className="ml-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/90 text-zinc-200 border border-white/20 shrink-0 shadow-sm">
                              Black NFT
                            </span>
                          );
                        })()}
                      </>
                    ) : (
                      <span className="text-white/40">Ожидание игр...</span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-amber-300 shrink-0 ml-2 transition-colors" />
              </button>

              {/* Round Header (Pool #, Mode, Status / Countdown) */}
              <div className="w-full flex flex-col mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 text-xs font-semibold">
                      Пул #{roundId}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80 uppercase">
                      СТАНДАРТ
                    </span>
                  </div>

                  <div className="text-xs font-bold">
                    {roundStatus === 'waiting' ? (
                      <span className="text-white/40">Ожидание участников...</span>
                    ) : roundStatus === 'betting' ? (
                      <span className="text-white/80">Ставки: {countdown}s</span>
                    ) : (
                      <span className="text-emerald-400">Завершено</span>
                    )}
                  </div>
                </div>

                {/* Big Pool Number */}
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-display font-black text-white tracking-tight">
                    {totalPool.toFixed(2)}
                  </span>
                  <span className="text-base font-bold text-white/70">
                    GRAM
                  </span>
                </div>

                {/* Gifts wagered row (if any) */}
                {roundGifts.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
                    {roundGifts.slice(0, 7).map((g, idx) => {
                      const bd = getNftBackdrop(g);
                      const isBlack = bd === 'Black';
                      const isOnyx = bd === 'Onyx Black';
                      return (
                        <div
                          key={idx}
                          className={`w-8 h-8 rounded-xl p-1 flex items-center justify-center shrink-0 border transition-all ${
                            isBlack
                              ? 'bg-[radial-gradient(circle,#282a2b_0%,#191919_100%)] border-white/30 shadow-[0_0_8px_rgba(0,0,0,0.85)]'
                              : isOnyx
                              ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/30 shadow-[0_0_8px_rgba(0,0,0,0.75)]'
                              : 'bg-white/5 border-white/10'
                          }`}
                          title={`${g.name}${bd !== 'Default' ? ` (${bd})` : ''}`}
                        >
                          <PremiumImage
                            src={g.image_url}
                            alt={g.name}
                            className="w-full h-full object-contain"
                            staticMode={true}
                          />
                        </div>
                      );
                    })}
                    {roundGifts.length > 7 && (
                      <div className="h-8 px-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        +{roundGifts.length - 7}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 
                ================================================================
                ARENA TERRITORY WINDOW (With Bouncing Ball on Drawing)
                ================================================================
              */}
              <div className="w-full relative min-h-[250px] h-[270px] sm:h-[300px] mb-3.5">
                {/* Background Liquid Glass Container */}
                <div className="absolute inset-0 rounded-[26px] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.10] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_45px_-16px_rgba(0,0,0,0.85)]">
                  {/* Upper glare */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)] z-[5]"
                  />

                  {/* Ambient background glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none z-0" />

                  {/* Territory Tiles */}
                  <div className="absolute inset-0 z-10 p-1.5">
                    {roundStatus === 'waiting' || territoryNodes.length === 0 ? (
                      <div className="w-full h-full rounded-[22px] flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 text-white/40">
                          <Dices className="w-6 h-6" />
                        </div>
                        <span className="text-white/60 text-xs font-medium max-w-[220px]">
                          Новая игра начнётся автоматически. Ожидайте!
                        </span>
                      </div>
                    ) : (
                      <div ref={setTerritoryMapElement} className="relative w-full h-full overflow-hidden rounded-[20px]">
                        {/* SVG Polygon Mesh: exact area, zero gaps, straight edges */}
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        >
                          {territoryNodes.map((node) => {
                            const isWinnerTerritory = winner?.id === node.participant.id && roundStatus === 'drawing' && !isBallActive;
                            return (
                              <polygon
                                key={node.participant.id}
                                points={node.pointsStr}
                                fill={node.participant.color}
                                stroke="#0d0e12"
                                strokeWidth="0.4"
                                style={{
                                  filter: isWinnerTerritory ? 'brightness(1.3)' : undefined,
                                  transition: 'filter 0.3s ease',
                                }}
                              />
                            );
                          })}
                        </svg>

                        {/* Every participant gets a visible marker, including low-share bets. */}
                        {territoryNodes.map((node) => {
                          const p = node.participant;
                          const pixelW = (node.w / 100) * territoryMapSize.width;
                          const pixelH = (node.h / 100) * territoryMapSize.height;
                          const minDim = Math.min(pixelW, pixelH);
                          const markerSize = Math.max(12, Math.min(58, Math.round(minDim * 0.68)));
                          const name = p.firstName || p.username || 'Игрок';
                          const shareLabel = p.percentage > 0 && p.percentage < 0.1
                            ? '<0.1%'
                            : `${p.percentage.toFixed(1)}%`;

                          return (
                            <React.Fragment key={`av_${p.id}`}>
                              <div
                                title={`${name} — ${shareLabel}`}
                                style={{
                                  position: 'absolute',
                                  left: `${node.cx}%`,
                                  top: `${node.cy}%`,
                                  width: `${markerSize}px`,
                                  height: `${markerSize}px`,
                                  transform: 'translate(-50%, -50%)',
                                  borderColor: p.color,
                                }}
                                className="pointer-events-none z-20 flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-black/60 shadow-[0_3px_12px_rgba(0,0,0,0.48)] ring-1 ring-black/20 transition-all duration-300"
                              >
                                {p.avatar || p.photoUrl ? (
                                  <img src={p.avatar || p.photoUrl} alt={name} className="h-full w-full rounded-full object-cover" />
                                ) : (
                                  <span className="text-[10px] font-black text-white">{name.slice(0, 1).toUpperCase()}</span>
                                )}
                              </div>
                              {/* Winner crown above avatar */}
                              {winner?.id === p.id && roundStatus === 'drawing' && !isBallActive && (
                                <motion.div
                                  initial={{ scale: 0, y: 6 }}
                                  animate={{ scale: 1, y: 0 }}
                                  transition={{ type: 'spring', stiffness: 380, damping: 15 }}
                                  className="pointer-events-none absolute z-30 -translate-x-1/2 text-[18px] leading-none drop-shadow-[0_2px_8px_rgba(251,191,36,0.85)]"
                                  style={{ left: `${node.cx}%`, top: `calc(${node.cy}% - ${markerSize / 2 + 14}px)` }}
                                >
                                  👑
                                </motion.div>
                              )}
                              {minDim >= 38 && (
                                <span
                                  className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-black/40 bg-black/75 px-1 py-px text-[8px] font-black leading-[12px] text-white shadow"
                                  style={{ left: `${node.cx}%`, top: `calc(${node.cy}% + ${markerSize / 2}px - 1px)` }}
                                >
                                  {shareLabel}
                                </span>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* Landing flash pulse on ice */}
                        <AnimatePresence>
                          {landPulse > 0 && ballPos && (
                            <motion.div
                              key={landPulse}
                              initial={{ opacity: 0.95, scale: 0.2 }}
                              animate={{ opacity: 0, scale: 2.2 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.65, ease: 'easeOut' }}
                              className="pointer-events-none absolute z-25 -translate-x-1/2 -translate-y-1/2 rounded-full w-24 h-24"
                              style={{
                                left: `${ballPos.x}%`,
                                top: `${ballPos.y}%`,
                                background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(251,191,36,0.6) 35%, transparent 70%)',
                              }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Ice ball: rendered in the same coordinate space as the territories. */}
                        {roundStatus === 'drawing' && ballPos && (
                          <div
                            className="pointer-events-none absolute z-30"
                            style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%`, transform: 'translate(-50%, -50%)' }}
                          >
                            <div className="relative flex h-8 w-8 items-center justify-center">
                              <div className="absolute bottom-0 h-2 w-6 rounded-full bg-black/55 blur-[2px]" />
                              <div className="absolute inset-0 scale-125 rounded-full bg-cyan-300/80 opacity-60 blur-sm" />
                              <div className="relative h-[22px] w-[22px] rounded-full border border-white/90 bg-[radial-gradient(circle_at_30%_28%,#ffffff,#d9f4ff_26%,#63d7f5_54%,#0879a8_82%,#082f49)] shadow-[0_3px_10px_rgba(6,182,212,0.75),inset_-2px_-3px_5px_rgba(0,30,55,0.55),inset_2px_2px_4px_rgba(255,255,255,0.85)]">
                                <span className="absolute left-[4px] top-[3px] h-[5px] w-[7px] rounded-full bg-white/90 blur-[0.5px]" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Action Error if any */}
              {actionError && (
                <div className="w-full p-2.5 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center rounded-xl font-medium">
                  {actionError}
                </div>
              )}

              {/* 
                ================================================================
                BUTTON: «Поставить ставку»
                ================================================================
              */}
              <div className="w-full mb-5">
                <button
                  onClick={() => { setMode('gram'); setShowBetModal(true); }}
                  disabled={roundStatus === 'drawing'}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#eab308] via-[#facc15] to-[#eab308] hover:brightness-105 active:scale-[0.98] transition-all text-black font-display font-black text-[15px] shadow-[0_4px_18px_rgba(234,179,8,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <GramIcon className="w-3 h-3 text-white" />
                  </div>
                  <span>{userBet ? `Ставка: ${userBet.contribution} G` : 'Поставить ставку'}</span>
                </button>
              </div>

              {/* 
                ================================================================
                PARTICIPANTS LIST («Участники»)
                ================================================================
              */}
              <div className="w-full flex flex-col gap-2 pb-8">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-white/60 text-xs font-semibold">
                    Участники
                  </span>
                  <span className="text-white/60 text-xs font-semibold tabular-nums">
                    {normalizedParticipants.length}
                  </span>
                </div>

                {normalizedParticipants.length === 0 ? (
                  <div className="w-full py-8 px-4 text-center rounded-[22px] bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs">
                    Ставок пока нет. Будьте первым!
                  </div>
                ) : (
                  normalizedParticipants.map((p, idx) => {
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-[20px] p-3 bg-white/[0.04] border border-white/[0.06] backdrop-blur-md transition-all"
                      >
                        {/* Left: Rank, Avatar, Name */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-white/40 text-xs font-bold w-4 text-center">
                            {idx + 1}
                          </span>
                          <img
                            src={p.avatar || p.photoUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-white/15 bg-white/5"
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-bold text-sm truncate max-w-[120px]">
                                {p.firstName}
                              </span>
                              {p.isUser && (
                                <span className="text-[9px] bg-white/10 text-white/90 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                  Вы
                                </span>
                              )}
                            </div>
                            {(() => {
                              const pGifts = p.gifts || (p.gift ? [p.gift] : []);
                              if (pGifts.length === 0) return null;
                              return (
                                <div className="flex items-center gap-1 mt-1">
                                  {pGifts.slice(0, 4).map((g, gIdx) => {
                                    const bd = getNftBackdrop(g);
                                    const isBlack = bd === 'Black';
                                    const isOnyx = bd === 'Onyx Black';
                                    return (
                                      <div
                                        key={gIdx}
                                        className={`w-5 h-5 rounded-md p-0.5 flex items-center justify-center shrink-0 border transition-all ${
                                          isBlack
                                            ? 'bg-[radial-gradient(circle,#282a2b_0%,#191919_100%)] border-white/30 shadow-[0_0_6px_rgba(0,0,0,0.85)]'
                                            : isOnyx
                                            ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/30 shadow-[0_0_6px_rgba(0,0,0,0.75)]'
                                            : 'bg-white/10 border-white/15'
                                        }`}
                                        title={`${g.name}${bd !== 'Default' ? ` (${bd})` : ''}`}
                                      >
                                        <PremiumImage
                                          src={g.image_url}
                                          alt={g.name}
                                          className="w-full h-full object-contain"
                                          staticMode={true}
                                        />
                                      </div>
                                    );
                                  })}
                                  {pGifts.length > 4 && (
                                    <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-1 py-0.5 rounded border border-purple-500/30">
                                      +{pGifts.length - 4}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Right: Share Bar + Bet Amount */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Colored Share Pill */}
                          <div
                            style={{
                              backgroundColor: `${p.color}25`,
                              borderColor: `${p.color}50`,
                              color: p.color,
                            }}
                            className="px-2 py-0.5 rounded-lg border text-[11px] font-bold tabular-nums"
                          >
                            {p.percentage > 0 && p.percentage < 0.1 ? '<0.1%' : `${p.percentage.toFixed(1)}%`}
                          </div>

                          {/* Bet Amount with green arrow */}
                          <div className="flex items-center gap-1">
                            <span className="text-white font-display font-black text-sm tabular-nums">
                              {p.contribution.toFixed(2)}
                            </span>
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                              ↑
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* 
        ========================================================================
        WINNER CELEBRATION MODAL (Clean, elegant native winning interface)
        ========================================================================
      */}
      <AnimatePresence>
        {showWinnerModal && winner && (
          <IceArenaCelebrationModal
            isOpen={showWinnerModal}
            onClose={() => setShowWinnerModal(false)}
            roundId={roundId}
            winner={winner}
            totalPool={totalPool}
            gifts={sortedRoundGifts}
            onContinue={handleContinue}
          />
        )}
      </AnimatePresence>

      {/* 
        ========================================================================
        TOP GAME CELEBRATION MODAL (Exact same interface as winning modal)
        ========================================================================
      */}
      <AnimatePresence>
        {showTopGameModal && topGame && (
          <IceArenaCelebrationModal
            isOpen={showTopGameModal}
            onClose={() => setShowTopGameModal(false)}
            isTopGame={true}
            roundId={topGame.record.id}
            winner={topGame.record.winner}
            totalPool={topGame.pool}
            gifts={topGame.record.gifts || topGame.record.participants?.flatMap(p => p.gifts || (p.gift ? [p.gift] : [])) || []}
          />
        )}
      </AnimatePresence>

      {/* 
        ========================================================================
        BETTING DRAWER (Exact modal from Rocket NewGame.tsx)
        ========================================================================
      */}
      <AnimatePresence>
        {showBetModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBetModal(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="group fixed bottom-0 left-0 right-0 z-[110] bg-[#16171b]/95 backdrop-blur-2xl rounded-t-[32px] p-5 pb-8 flex flex-col shadow-2xl border-t border-white/[0.12] max-w-md mx-auto overflow-hidden"
            >
              {/* Upper liquid glass glare */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-t-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
              />

              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="w-8" />
                <h2 className="text-[17px] font-display font-bold text-white text-center">
                  Сделать ставку
                </h2>
                <button
                  onClick={() => setShowBetModal(false)}
                  className="w-8 h-8 rounded-full lg-glass flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segment Toggle: Gifts / GRAM */}
              <LiquidSegment
                className="relative z-10 mb-4"
                ariaLabel="Режим ставки"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'nft', label: t('gifts') || 'NFT' },
                  { value: 'gram', label: 'GRAM' },
                ]}
              />

              {/* Mode Body: GRAM or NFT Picker in Liquid Glass */}
              <div className="relative z-10 bg-white/[0.04] border border-white/[0.08] rounded-[24px] p-5 mb-5 flex flex-col items-center justify-center min-h-[120px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                {mode === 'gram' ? (
                  <>
                    <div className="absolute top-3.5 left-4 flex items-center gap-1.5 text-white/50 text-[12px] font-medium">
                      <span>{t('balance') || 'Баланс'}:</span>
                      <span className="text-white font-bold">{balance.toFixed(2)}</span>
                      <GramIcon className="w-3.5 h-3.5 text-brand" />
                    </div>

                    <div className="relative w-full text-center flex items-center justify-center mb-4 mt-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={betInput}
                        onChange={handleBetChange}
                        className="bg-transparent text-center text-4xl font-display font-bold text-white outline-none w-full max-w-[200px]"
                        placeholder="0.1"
                      />
                    </div>

                    {/* Quick Add Buttons */}
                    <div className="flex gap-1.5 flex-wrap justify-center">
                      {[1, 5, 25, 50].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setBetAdd(amt)}
                          className="px-3 py-1.5 rounded-full lg-glass text-white text-[12px] font-bold active:scale-95 transition-all cursor-pointer"
                        >
                          +{amt}
                        </button>
                      ))}
                      <button
                        onClick={setBetMax}
                        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0098ea] to-[#00b4d8] hover:brightness-110 border border-cyan-300/40 text-white text-[12px] font-bold active:scale-95 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,152,234,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]"
                      >
                        MAX
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex flex-col">
                    {selectedNfts.length > 0 && (
                      <div className="w-full mb-3 flex flex-col gap-1.5 bg-black/25 rounded-2xl p-2.5 border border-white/10">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-white/70 text-xs font-semibold">
                            Выбрано: <strong className="text-white">{selectedNfts.length} NFT</strong>
                          </span>
                          <div className="flex items-center gap-1 text-xs font-bold text-amber-300">
                            <span>{totalNftBetValue.toFixed(2)}</span>
                            <GramIcon className="w-3 h-3 text-amber-300" />
                          </div>
                        </div>
                        {/* Chips: up to 7 icons, then count of remaining */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {selectedNfts.slice(0, 7).map((nft, idx) => (
                            <div
                              key={nft.uniqueId || nft.id || idx}
                              onClick={() => handleToggleNft(nft)}
                              className="relative w-8 h-8 rounded-xl bg-white/5 border border-white/15 p-1 flex items-center justify-center shrink-0 cursor-pointer hover:border-red-400 transition-all group"
                              title={`Удалить ${nft.name}`}
                            >
                              <PremiumImage
                                src={nft.image_url}
                                alt={nft.name}
                                className="w-full h-full object-contain"
                                staticMode={true}
                              />
                              <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 text-xs transition-opacity font-bold">
                                ✕
                              </div>
                            </div>
                          ))}
                          {selectedNfts.length > 7 && (
                            <div className="h-8 px-2.5 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              +{selectedNfts.length - 7} ещё
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <NftSelectorGrid
                      inventory={inventory}
                      selectedIds={selectedNfts.map(n => n.uniqueId || n.id)}
                      onSelect={handleToggleNft}
                      maxBetGram={999999}
                      maxContainerHeight="max-h-[280px]"
                      emptyText={t('inventory_empty') || 'Инвентарь пуст'}
                    />
                  </div>
                )}
              </div>

              {/* Confirm Button */}
              <button
                id="rocket-confirm-bet-button"
                onClick={handlePlaceBet}
                disabled={
                  isSubmittingBet ||
                  (mode === 'gram' && ((parseFloat(betInput) || 0) < 0.1 || (parseFloat(betInput) || 0) > balance)) ||
                  (mode === 'nft' && selectedNfts.length === 0)
                }
                className="w-full font-display font-bold text-[16px] py-4 rounded-full active:scale-[0.98] transition-all shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmittingBet
                  ? 'Размещение...'
                  : mode === 'gram'
                  ? 'Сделать ставку'
                  : `Поставить ${selectedNfts.length} NFT (${totalNftBetValue.toFixed(2)} G)`}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* 
        ========================================================================
        ROUND DETAILS MODAL (For History & Top Game Inspection)
        ========================================================================
      */}
      <AnimatePresence>
        {selectedHistoryRound && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHistoryRound(null)}
              className="fixed inset-0 z-[115] bg-black/70 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="group fixed bottom-0 left-0 right-0 z-[120] bg-[#16171b]/98 backdrop-blur-2xl rounded-t-[32px] p-5 pb-8 flex flex-col shadow-2xl border-t border-white/[0.12] max-w-md mx-auto max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-8" />
                <h2 className="text-[17px] font-display font-bold text-white text-center">
                  Раунд #{selectedHistoryRound.id}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryRound(null)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-3 pr-0.5 pb-2">
                {/* Bank & Status Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      Банк раунда
                    </span>
                    <div className="flex items-center gap-1.5 font-display text-[18px] font-black text-white mt-1">
                      <span>{selectedHistoryRound.totalPool.toFixed(2)}</span>
                      <GramIcon className="w-4 h-4 text-brand" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      Статус
                    </span>
                    <div className="flex items-center gap-1 text-[13px] font-bold text-emerald-400 mt-1">
                      <span>Завершён</span>
                    </div>
                  </div>
                </div>

                {/* Winner Card */}
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={selectedHistoryRound.winner.avatar || selectedHistoryRound.winner.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Winner'}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover border-2 border-emerald-400 shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>Победитель</span>
                      </div>
                      <span className="text-white font-bold text-sm truncate">
                        {selectedHistoryRound.winner.firstName || selectedHistoryRound.winner.username || 'Победитель'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <div className="flex items-center gap-1 font-display text-[16px] font-black text-emerald-300">
                      <span>+{selectedHistoryRound.totalPool.toFixed(2)}</span>
                      <GramIcon className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <span className="text-[10px] text-white/40 font-medium">Выплата</span>
                  </div>
                </div>

                {/* Won NFTs in History modal (with Black/Onyx styling) */}
                {(() => {
                  const hGifts = selectedHistoryRound.gifts || selectedHistoryRound.participants?.flatMap(p => p.gifts || (p.gift ? [p.gift] : [])) || [];
                  if (hGifts.length === 0) return null;
                  return (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider px-1">
                        Разыгранные NFT ({hGifts.length})
                      </span>
                      <div className={`grid gap-2 ${hGifts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {hGifts.slice(0, 4).map((g: any, i: number) => (
                          <NftPrizeCard key={i} gift={g} compact={hGifts.length > 1} />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Participants list if available */}
                {selectedHistoryRound.participants && selectedHistoryRound.participants.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider px-1">
                      Участники ({selectedHistoryRound.participants.length})
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {selectedHistoryRound.participants.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={p.avatar || p.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                            />
                            <span className="text-white text-xs font-bold truncate">
                              {p.firstName || p.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-white/60 text-xs font-bold">
                              {p.percentage || 0}%
                            </span>
                            <span className="text-white font-display font-black text-xs">
                              {(p.contribution || p.betAmount || 0).toFixed(2)} G
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedHistoryRound(null)}
                className="w-full mt-3 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.98] transition-all text-white font-display font-bold text-sm cursor-pointer"
              >
                Закрыть
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default IceArena;
