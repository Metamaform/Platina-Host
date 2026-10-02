import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cleanNftName } from '../lib/nftUtils';
import { useTranslation } from '../lib/i18n';

export interface BetHistoryRecord {
  id: string | number;
  roundId: string | number;
  timestamp: number;
  betAmount: number;
  mode: 'gram' | 'nft';
  gift?: any;
  multiplier: number;
  winAmount: number;
  isWon: boolean;
  // Detailed params matching the design in IMG_0888
  payoutGram?: number;
  payoutItem?: string;
  cashoutType?: 'Ручной' | 'Авто' | string;
  cashoutMult?: number;
  acceptedAt?: number;
  cashoutReqTime?: string;
  cashoutTime?: string;
  crashMult?: number;
  crashTime?: string;
  balanceBefore?: number;
  balanceAfter?: number;
}

interface BetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  history: BetHistoryRecord[];
}

export const BetHistoryModal: React.FC<BetHistoryModalProps> = ({
  isOpen,
  onClose,
  title,
  history
}) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | number | null>(
    history.length > 0 ? history[0].id : null
  );

  if (!isOpen) return null;

  const toggleExpand = (id: string | number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const formatDateHeader = (ts: number) => {
    const d = new Date(ts);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
  };

  const formatExactTime = (ts: number, offsetMs: number = 0) => {
    const d = new Date(ts + offsetMs);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${day}.${month} ${hours}:${minutes}:${seconds}.${ms}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Sheet matching IMG_0888 */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="relative z-10 w-full max-w-lg max-h-[88vh] flex flex-col bg-[#121316] border border-white/10 rounded-t-[32px] sm:rounded-[28px] shadow-2xl overflow-hidden text-white"
        >
          {/* Top Grab Handle */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2 pb-4">
            <div>
              <h2 className="font-display font-bold text-[19px] sm:text-[20px] tracking-tight text-white leading-tight">
                {title || t('bet_history_title')}
              </h2>
              <p className="text-[12px] text-white/40 font-medium mt-0.5">
                {t('bet_history_last20')}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full lg-glass active:scale-95 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bet List */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2.5 custom-scrollbar">
            {history.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center">
                <span className="text-white/40 text-sm font-medium">{t('bet_history_empty')}</span>
                <span className="text-white/20 text-xs mt-1">{t('bet_history_empty_hint')}</span>
              </div>
            ) : (
              history.slice(0, 20).map((bet, idx) => {
                const isExpanded = expandedId === bet.id;
                const isWon = !!bet.isWon;
                const betMult = bet.multiplier || (isWon ? 1.5 : 1.0);
                const cashoutMultStr = (bet.cashoutMult || betMult).toFixed(2);
                const crashMultStr = (bet.crashMult || betMult).toFixed(2);
                const profitAmount = isWon
                  ? Math.max(0, (bet.winAmount || bet.betAmount * betMult) - bet.betAmount)
                  : bet.betAmount;

                const payoutGramVal = bet.payoutGram !== undefined
                  ? bet.payoutGram
                  : isWon ? bet.winAmount : 0;

                const totalPayoutVal = bet.winAmount !== undefined
                  ? bet.winAmount
                  : isWon ? (bet.betAmount * betMult) : 0;

                const giftName = bet.gift?.name
                  ? cleanNftName(bet.gift.name)
                  : bet.payoutItem || '-';

                const reqTime = bet.cashoutReqTime || formatExactTime(bet.timestamp, -120);
                const cTime = bet.cashoutTime || formatExactTime(bet.timestamp);
                const crTime = bet.crashTime || formatExactTime(bet.timestamp, 4447);

                const balBefore = bet.balanceBefore !== undefined
                  ? bet.balanceBefore.toFixed(4)
                  : (bet.betAmount * 1.5).toFixed(4);

                const balAfter = bet.balanceAfter !== undefined
                  ? bet.balanceAfter.toFixed(4)
                  : (isWon ? (bet.betAmount * 1.5 + profitAmount) : (bet.betAmount * 0.5)).toFixed(4);

                return (
                  <div
                    key={`bet_${bet.id || 'b'}_${bet.timestamp || ''}_${idx}`}
                    className={`rounded-2xl transition-all border ${
                      isExpanded
                        ? 'bg-[#15171b] border-white/10 shadow-lg'
                        : 'bg-[#15161a] border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Collapsed / Clickable Row */}
                    <div
                      onClick={() => toggleExpand(bet.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                    >
                      {/* Left: Icon & Title info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isWon
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}
                        >
                          {isWon ? (
                            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-white font-bold text-[13px] sm:text-[14px]">
                              {bet.betAmount.toFixed(bet.betAmount < 1 ? 2 : 1)} GRAM
                            </span>
                            <span className="text-white/30 text-xs">·</span>
                            {isWon ? (
                              <span className="text-emerald-400 text-xs font-semibold">
                                {t('bet_history_cashout_at')} ×{cashoutMultStr}
                              </span>
                            ) : (
                              <span className="text-rose-400 text-xs font-semibold flex items-center gap-1">
                                {t('crashed')} 💥 ×{crashMultStr}
                              </span>
                            )}
                          </div>
                          <span className="text-white/40 text-[11px] mt-0.5 font-medium">
                            {formatDateHeader(bet.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Profit/Loss & Chevron */}
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span
                          className={`font-display font-bold text-[13px] sm:text-[14px] ${
                            isWon ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isWon ? `+${profitAmount.toFixed(2)}` : `-${profitAmount.toFixed(2)}`} GRAM
                        </span>
                        <div className="text-white/40">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detailed Grid matching IMG_0888 */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
                          {/* Column 1 */}
                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('bet_id')}
                            </span>
                            <span className="font-mono text-[12px] text-white/90 font-medium">
                              #{bet.id}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('round')}
                            </span>
                            <span className="font-mono text-[12px] text-white/90 font-medium">
                              #{bet.roundId}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('type')}
                            </span>
                            <span className="text-[12px] text-white/90 font-medium">
                              {bet.mode === 'nft' ? 'NFT' : 'GRAM'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('bet')}
                            </span>
                            <span className="text-[12px] text-white/90 font-medium">
                              {bet.betAmount.toFixed(bet.betAmount < 1 ? 2 : 1)} GRAM
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('payout_gram')}
                            </span>
                            <span
                              className={`text-[12px] font-semibold ${
                                payoutGramVal > 0 ? 'text-emerald-400' : 'text-white/60'
                              }`}
                            >
                              {payoutGramVal.toFixed(2)} GRAM
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('payout_total')}
                            </span>
                            <span
                              className={`text-[12px] font-semibold ${
                                totalPayoutVal > 0 ? 'text-emerald-400' : 'text-white/60'
                              }`}
                            >
                              {totalPayoutVal.toFixed(2)} GRAM
                            </span>
                          </div>

                          <div className="col-span-2">
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('payout_item')}
                            </span>
                            <span className="text-[12px] text-white/90 font-medium">
                              {giftName}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('cashout')}
                            </span>
                            <span className="text-[12px] text-white/90 font-medium">
                              {bet.cashoutType === 'Ручной' ? t('cashout_manual') : bet.cashoutType === 'Авто' ? t('cashout_auto') : (bet.cashoutType || (isWon ? t('cashout_manual') : '-'))}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('accepted_at')}
                            </span>
                            <span className="font-mono text-[12px] text-white/90 font-medium">
                              {isWon ? `×${bet.acceptedAt || cashoutMultStr}` : '-'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('cashout_at')}
                            </span>
                            <span className="font-mono text-[12px] text-white/90 font-medium">
                              {isWon ? `×${cashoutMultStr}` : '-'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('cashout_request')}
                            </span>
                            <span className="font-mono text-[11px] text-white/80">
                              {isWon ? reqTime : '-'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('cashout_time')}
                            </span>
                            <span className="font-mono text-[11px] text-white/80">
                              {isWon ? cTime : '-'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('crash_at')}
                            </span>
                            <span className="font-mono text-[12px] text-white/90 font-medium">
                              ×{crashMultStr}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('crash_time')}
                            </span>
                            <span className="font-mono text-[11px] text-white/80">
                              {crTime}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('balance_before')}
                            </span>
                            <span className="font-mono text-[11px] text-white/80">
                              {balBefore} GRAM
                            </span>
                          </div>

                          <div className="col-span-2">
                            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                              {t('balance_after')}
                            </span>
                            <span className="font-mono text-[12px] font-semibold text-emerald-400">
                              {balAfter} GRAM
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
