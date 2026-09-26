import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, Clock, Timer, Wallet, Trophy, ShieldCheck, Hash, Copy, Check, Activity, Layers } from 'lucide-react';
import { GramIcon } from './GramIcon';

export interface GameRoundInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: 'plinko' | 'rocket';
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
    : `RK-LIVE`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative z-10 w-full max-w-md max-h-[85vh] flex flex-col bg-[#16171d] border border-white/10 rounded-[28px] shadow-2xl overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/90 shadow-inner">
                <Settings className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-[16px] leading-tight flex items-center gap-1.5">
                  <span>Параметры раунда</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
                </h3>
                <span className="text-[11px] text-white/50 font-medium">
                  {game === 'plinko' ? 'Plinko' : 'Ракетка'} • Live серверная статистика
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar">

            {/* Quick Status Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-white/70 font-medium">Состояние сервера:</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {statusText || 'Активен (Синхронизирован)'}
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
                    title="Копировать ID раунда"
                  >
                    {copiedKey === 'round' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="font-mono font-bold text-[13px] text-white truncate">
                  #{displayRoundId}
                </div>
                <span className="text-[10px] text-white/40 mt-0.5">Текущий раунд</span>
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
                <span className="text-[10px] text-emerald-400/90 font-medium mt-0.5">Доступно для игры</span>
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
                  {timeoutSec > 0 ? `${timeoutSec.toFixed(1)} сек` : '0.0 сек'}
                </div>
                <span className="text-[10px] text-white/40 mt-0.5">Интервал раунда</span>
              </div>

              {/* 5. Max Prize / Prize */}
              <div className="col-span-2 bg-[#1b1c24] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    Prize (Макс. выигрыш)
                  </span>
                  <div className="flex items-center gap-1 font-display font-black text-lg text-amber-300 mt-0.5">
                    <span>{maxPrize.toLocaleString('ru-RU')}</span>
                    <GramIcon className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
                {currentPrize !== undefined && currentPrize > 0 && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-white/40 uppercase">Текущий приз</span>
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
                <span>Лимиты ставок</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/25 p-2 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-white/40 text-[10px]">Минимальная ставка</span>
                  <span className="font-bold text-white mt-0.5">{minBet.toFixed(1)} GRAM</span>
                </div>
                <div className="bg-black/25 p-2 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-white/40 text-[10px]">Максимальная ставка</span>
                  <span className="font-bold text-white mt-0.5">{maxBet.toLocaleString('ru-RU')} GRAM</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Close Button */}
          <div className="p-4 border-t border-white/5 bg-[#14151a]">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm active:scale-98 transition-all cursor-pointer border border-white/10"
            >
              Закрыть
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
