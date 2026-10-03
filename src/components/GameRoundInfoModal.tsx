import React, { useState, useEffect } from 'react';
import { Settings, Clock, Timer, Wallet, Hash, Copy, Check, Activity, Layers } from 'lucide-react';
import { AnimatedTrophy } from './AnimatedTrophy';
import { GramIcon } from './GramIcon';
import { LiquidDialog } from './ui/LiquidDialog';
import { useTranslation } from '../lib/i18n';

export interface GameRoundInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: 'plinko' | 'rocket' | 'ice_arena';
  roundId?: string | number;
  balance: number;
  timeoutSec?: number;
  serverTime?: number;
  maxPrize?: number;
  currentPrize?: number;
  statusText?: string;
  minBet?: number;
  maxBet?: number;
}

export const GameRoundInfoModal: React.FC<GameRoundInfoModalProps> = ({
  isOpen,
  onClose,
  game,
  roundId,
  balance,
  timeoutSec = 5,
  serverTime,
  maxPrize = 7000,
  currentPrize,
  statusText,
  minBet = 0.1,
  maxBet = 7000
}) => {
  const { t } = useTranslation();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Real-time ticking clock
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 500);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formattedTime = currentTime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const displayRoundId = roundId
    ? `${roundId}`
    : game === 'plinko'
    ? `PLK-${currentTime.getFullYear()}${(currentTime.getMonth() + 1).toString().padStart(2, '0')}${currentTime.getDate().toString().padStart(2, '0')}-LIVE`
    : game === 'ice_arena'
    ? `ICE-${currentTime.getFullYear()}${(currentTime.getMonth() + 1).toString().padStart(2, '0')}${currentTime.getDate().toString().padStart(2, '0')}-LIVE`
    : `RK-LIVE`;

  return (
    <LiquidDialog
      title={t('round_settings')}
      subtitle={`${game === 'plinko' ? 'Plinko' : game === 'ice_arena' ? 'Ice Arena' : 'ROCKET'} · ${t('server_stats')}`}
      icon={<Settings className="w-4 h-4" />}
      onClose={onClose}
      actionLabel={t('close')}
    >
      <div className="space-y-3.5 pb-1">

            {/* Quick Status Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-white/70 font-medium">{t('server_status')}:</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {statusText || t('server_active')}
              </span>
            </div>

            {/* Primary Grid Metrics */}
            <div className="grid grid-cols-2 gap-2.5">

              {/* 1. Round ID */}
              <div className="bg-[#1b1c24] p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/40 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3 text-amber-400" />
                    Round
                  </span>
                  <button
                    onClick={() => handleCopy(displayRoundId, 'round')}
                    className="p-1 hover:text-white transition-colors text-white/30"
                    title={t('copy_round_id')}
                  >
                    {copiedKey === 'round' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="font-mono font-bold text-[13px] text-white truncate">
                  #{displayRoundId}
                </div>
                <span className="text-[10px] text-white/40 mt-0.5">{t('current_round')}</span>
              </div>

              {/* 2. Balance */}
              <div className="bg-[#1b1c24] p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/40 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-brand" />
                    Balance
                  </span>
                </div>
                <div className="flex items-center gap-1 font-display font-extrabold text-[15px] text-white">
                  <span>{balance.toFixed(2)}</span>
                  <GramIcon className="w-3.5 h-3.5 text-brand" />
                </div>
                <span className="text-[10px] text-emerald-400/90 font-medium mt-0.5">{t('available_to_play')}</span>
              </div>

              {/* 3. Server Time */}
              <div className="bg-[#1b1c24] p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/40 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    Time
                  </span>
                </div>
                <div className="font-mono font-bold text-[13px] text-white tracking-wide">
                  {formattedTime}
                </div>
                <span className="text-[10px] text-white/40 mt-0.5">{formattedDate} UTC</span>
              </div>

              {/* 4. Time out */}
              <div className="bg-[#1b1c24] p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/40 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Timer className="w-3 h-3 text-purple-400" />
                    Time out
                  </span>
                </div>
                <div className="font-mono font-bold text-[13px] text-purple-300">
                  {timeoutSec > 0 ? `${timeoutSec.toFixed(1)} ${t('sec_short')}` : `0.0 ${t('sec_short')}`}
                </div>
                <span className="text-[10px] text-white/40 mt-0.5">{t('round_interval')}</span>
              </div>

              {/* 5. Max Prize / Prize */}
              <div className="col-span-2 bg-[#1b1c24] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                    <AnimatedTrophy className="w-3.5 h-3.5" />
                    {t('prize_max')}
                  </span>
                  <div className="flex items-center gap-1 font-display font-black text-lg text-amber-300 mt-0.5">
                    <span>{maxPrize.toLocaleString('ru-RU')}</span>
                    <GramIcon className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
                {currentPrize !== undefined && currentPrize > 0 && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-white/40 uppercase">{t('current_prize')}</span>
                    <span className="font-display font-bold text-emerald-400 text-sm">
                      +{currentPrize.toFixed(2)} GRAM
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Betting Limits Card */}
            <div className="bg-[#1b1c24] rounded-2xl p-3.5 border border-white/5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/80 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-brand" />
                <span>{t('bet_limits')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/25 p-2 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-white/40 text-[10px]">{t('min_bet')}</span>
                  <span className="font-bold text-white mt-0.5">{minBet.toFixed(1)} GRAM</span>
                </div>
                <div className="bg-black/25 p-2 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-white/40 text-[10px]">{t('max_bet')}</span>
                  <span className="font-bold text-white mt-0.5">{maxBet.toLocaleString('ru-RU')} GRAM</span>
                </div>
              </div>
            </div>

      </div>
    </LiquidDialog>
  );
};
