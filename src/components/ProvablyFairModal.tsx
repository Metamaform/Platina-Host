import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Copy, Check, Info, Sparkles, Hash, Clock, Award, Layers } from 'lucide-react';
import { GramIcon } from './GramIcon';
import { PremiumImage } from './PremiumImage';
import { cleanNftName } from '../lib/nftUtils';

export interface ProvablyFairData {
  id: string;
  timestamp: number;
  betAmount: number;
  mode: 'gram' | 'nft';
  betGift?: any;
  multiplier: number;
  winAmount: number;
  gift?: any;
  remainder?: number;
  isWon?: boolean;
  // Plinko specific
  risk?: string;
  path?: number[];
  targetBucket?: number;
  targetRtp?: number;
  isLuckyBoost?: boolean;
  // Rocket specific
  roundId?: number;
  crashMult?: number;
  cashoutMult?: number;
  flightTimeSec?: number;
  // Crypto
  serverSeedHash: string;
  clientSeed: string;
  nonce?: number;
}

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: 'plinko' | 'rocket';
  data: ProvablyFairData | null;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  isOpen,
  onClose,
  game,
  data
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !data) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formattedDate = new Date(data.timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const mult = data.multiplier || 1.0;
  const isWon = data.isWon !== undefined ? data.isWon : mult >= 1.0;

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

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative z-10 w-full max-w-md max-h-[90vh] flex flex-col bg-[#16171d] border border-white/10 rounded-[28px] shadow-2xl overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-[16px] leading-tight flex items-center gap-1.5">
                  <span>Детали раунда</span>
                </h3>
                <span className="text-[11px] text-white/50 font-medium">
                  Параметры и исход раунда
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

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">

            {/* Outcome Summary Banner */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isWon
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex flex-col">
                <span className="text-white/50 text-[11px] font-medium uppercase tracking-wider">
                  Итоговый результат
                </span>
                <span className={`text-2xl font-display font-black tracking-tight ${
                  mult >= 8.0 ? 'text-amber-300' : mult >= 3.0 ? 'text-blue-400' : mult >= 1.2 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  x{mult.toFixed(2)}
                </span>
                <span className="text-[12px] text-white/70 mt-0.5">
                  Ставка: {data.betAmount.toFixed(2)} GRAM {data.mode === 'nft' ? '(NFT)' : ''}
                </span>
              </div>

              {data.gift ? (
                <div className="flex items-center gap-2.5 bg-black/40 rounded-2xl p-2 pr-3 border border-white/10">
                  <PremiumImage
                    src={data.gift.image_url}
                    alt={data.gift.name}
                    className="w-12 h-12 object-contain drop-shadow"
                    staticMode={true}
                  />
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-white max-w-[100px] truncate text-right">
                      {cleanNftName(data.gift.name)}
                    </span>
                    <span className="text-brand font-bold text-xs flex items-center gap-1 mt-0.5">
                      {Number(data.gift.floor_price_gram || data.gift.price || data.winAmount).toFixed(2)}
                      <GramIcon className="w-3 h-3" />
                    </span>
                    {data.remainder !== undefined && data.remainder > 0 && (
                      <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                        +{data.remainder.toFixed(2)} G на баланс
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <span className="text-white/50 text-[11px] font-medium">Выплата</span>
                  <span className={`text-lg font-bold flex items-center gap-1 ${
                    isWon ? 'text-emerald-400' : data.winAmount > 0 ? 'text-red-400' : 'text-white/50'
                  }`}>
                    {data.winAmount > 0 ? `+${data.winAmount.toFixed(2)}` : `0.00`}
                    <GramIcon className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}
            </div>

            {/* Game Characteristics Card */}
            <div className="bg-[#1b1c24] rounded-2xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/80 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-brand" />
                <span>Характеристики раунда</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-black/25 p-2.5 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">ID раунда</span>
                  <span className="font-mono text-white/90 truncate block text-[11px] mt-0.5">
                    {data.id}
                  </span>
                </div>

                <div className="bg-black/25 p-2.5 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px]">Дата и время</span>
                  <span className="font-mono text-white/90 truncate block text-[11px] mt-0.5">
                    {formattedDate}
                  </span>
                </div>

                {game === 'plinko' && (
                  <>
                    <div className="bg-black/25 p-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 block text-[10px]">Уровень риска</span>
                      <span className="font-bold text-white capitalize text-[12px] mt-0.5 block">
                        {data.risk || 'High'}
                      </span>
                    </div>

                    <div className="bg-black/25 p-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 block text-[10px]">Статус раунда</span>
                      <span className="font-bold text-emerald-400 text-[12px] mt-0.5 block">
                        Завершен
                      </span>
                    </div>

                    {data.path && (
                      <div className="col-span-2 bg-black/25 p-2.5 rounded-xl border border-white/5">
                        <span className="text-white/40 block text-[10px] mb-1">
                          Траектория колышков (8 шагов) → Корзина #{data.targetBucket ?? 4}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-brand">
                          {data.path.map((step, idx) => (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                step === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {step === 1 ? 'R' : 'L'}
                            </span>
                          ))}
                          <span className="text-white/40 text-[10px] ml-1">
                            ({data.path.filter(p => p === 1).length} вправо)
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {game === 'rocket' && (
                  <>
                    <div className="bg-black/25 p-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 block text-[10px]">Точка краша ракеты</span>
                      <span className="font-bold text-red-400 text-[12px] mt-0.5 block">
                        x{Number(data.crashMult || 1.0).toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-black/25 p-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 block text-[10px]">Точка вывода</span>
                      <span className="font-bold text-emerald-400 text-[12px] mt-0.5 block">
                        {data.cashoutMult ? `x${Number(data.cashoutMult).toFixed(2)}` : 'Не выведено'}
                      </span>
                    </div>

                    {data.flightTimeSec !== undefined && (
                      <div className="col-span-2 bg-black/25 p-2.5 rounded-xl border border-white/5 flex justify-between items-center">
                        <span className="text-white/40 text-[10px]">Время полёта до исхода:</span>
                        <span className="font-bold text-white text-[11px]">
                          {data.flightTimeSec.toFixed(2)} сек
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Cryptographic Verification Proofs */}
            <div className="bg-[#1b1c24] rounded-2xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/80 uppercase tracking-wider">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                <span>Криптографические ключи раунда</span>
              </div>

              {/* Server Seed Hash */}
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-white/40 block">Server Seed (SHA-256)</span>
                  <span className="font-mono text-[11px] text-white/80 truncate block select-all">
                    {data.serverSeedHash}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(data.serverSeedHash, 'serverSeed')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Копировать"
                >
                  {copiedKey === 'serverSeed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Client Seed */}
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-white/40 block">Client Seed</span>
                  <span className="font-mono text-[11px] text-white/80 truncate block select-all">
                    {data.clientSeed}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(data.clientSeed, 'clientSeed')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Копировать"
                >
                  {copiedKey === 'clientSeed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Provably Fair Guarantee Note */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Исход данного раунда был математически и криптографически зафиксирован до начала броска. Сервер не имеет технической возможности подстроить результат в ходе игры.
                </p>
              </div>
            </div>

          </div>

          {/* Close Action Button */}
          <div className="p-4 border-t border-white/5 bg-[#14151b]">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
