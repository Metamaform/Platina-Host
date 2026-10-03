/*
  BetModal AICE ARENA — единая нижняя шторка в стиле Rocket:
  переключатель GRAM / NFT, крупный ввод суммы с быстрыми кнопками
  (+1/+5/+25/+50/MAX) или сетка инвентаря для ставки предметом.
  Одна ставка — либо GRAM, либо один NFT (как в Rocket).
*/

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';
import { GramIcon } from '../GramIcon';
import { NftSelectorGrid } from '../NftSelectorGrid';
import { haptics } from '../../lib/haptics';

interface BetModalProps {
  onClose: () => void;
  /** amount — сумма GRAM (в NFT-режиме всегда 0), gift — предмет или null */
  onConfirm: (amount: number, gift: any | null) => void;
  balance: number;
  minBet: number;
  maxBet: number;
  submitting: boolean;
  inventory: any[];
  error: string | null;
  t: (k: string) => string;
}

type BetMode = 'gram' | 'nft';

export const BetModal: React.FC<BetModalProps> = ({
  onClose, onConfirm, balance, minBet, maxBet, submitting, inventory, error, t,
}) => {
  const [mode, setMode] = useState<BetMode>(() => {
    try {
      return (localStorage.getItem('arena_mode') as BetMode) || 'gram';
    } catch {
      return 'gram';
    }
  });
  const [betInput, setBetInput] = useState<string>(() => {
    try {
      return localStorage.getItem('arena_bet') || '10';
    } catch {
      return '10';
    }
  });
  const [selectedNft, setSelectedNft] = useState<any>(null);

  useEffect(() => {
    try { localStorage.setItem('arena_mode', mode); } catch {}
  }, [mode]);
  useEffect(() => {
    try { localStorage.setItem('arena_bet', betInput); } catch {}
  }, [betInput]);

  // NFT жив, только пока он реально есть в инвентаре.
  useEffect(() => {
    setSelectedNft((prev: any) =>
      prev && inventory.some((i) => (i.uniqueId || i.id) === (prev.uniqueId || prev.id) && !i.isWithdrawing)
        ? prev
        : null
    );
  }, [inventory]);

  const betGram = parseFloat(betInput.replace(',', '.')) || 0;
  const nftValue = selectedNft ? Number(selectedNft.floor_price_gram || selectedNft.price || 0) : 0;

  const validationError: string | null = useMemo(() => {
    if (mode === 'gram') {
      if (betGram <= 0) return null;
      if (betGram < minBet) return `${t('arena_min_bet')} ${minBet.toFixed(2)} GRAM`;
      if (betGram > maxBet) return `${t('arena_max_bet')} ${maxBet.toFixed(0)} GRAM`;
      if (betGram > balance) return t('arena_insufficient');
      return null;
    }
    if (!selectedNft) return null;
    if (nftValue < minBet) return `${t('arena_min_bet')} ${minBet.toFixed(2)} GRAM`;
    if (nftValue > maxBet) return `${t('arena_max_bet')} ${maxBet.toFixed(0)} GRAM`;
    return null;
  }, [mode, betGram, selectedNft, nftValue, minBet, maxBet, balance, t]);

  const canConfirm = !submitting && !validationError && (
    mode === 'gram' ? betGram >= minBet && betGram <= balance && betGram <= maxBet : !!selectedNft
  );

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '.');
    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
      if (val !== '' && parseFloat(val) > maxBet) {
        setBetInput(maxBet.toString());
      } else {
        setBetInput(val);
      }
    }
  };

  const setBetAdd = (amt: number) => {
    const cur = parseFloat(betInput) || 0;
    const next = Math.min(cur + amt, balance, maxBet);
    setBetInput(next.toString());
  };

  const setBetMax = () => {
    const max = Math.min(balance, maxBet);
    setBetInput(max.toString());
  };

  const shownError = error || validationError;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="group relative w-full max-w-md bg-[#16171b]/98 backdrop-blur-2xl rounded-t-[24px] px-4 pt-3 pb-5 flex flex-col shadow-2xl border-t border-white/[0.12] overflow-hidden max-h-[88vh] overflow-y-auto custom-scrollbar">
        {/* верхний блик жидкого стекла */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-t-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
        />

        <div className="relative z-10 flex items-center justify-between mb-2.5">
          <div className="w-7" />
          <h2 className="text-[15px] font-display font-bold text-white text-center">
            {t('arena_make_bet') || 'Сделать ставку'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative z-10 mb-2.5 w-full flex rounded-xl bg-white/[0.04] p-0.5 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setMode('nft');
              haptics.selection();
            }}
            className="relative flex-1 py-1 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer z-10"
          >
            {mode === 'nft' && (
              <motion.div
                layoutId="arena-bet-modal-mode-pill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className={mode === 'nft' ? 'text-black font-bold' : 'text-white/60 hover:text-white font-bold'}>
              {t('gifts')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('gram');
              haptics.selection();
            }}
            className="relative flex-1 py-1 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer z-10"
          >
            {mode === 'gram' && (
              <motion.div
                layoutId="arena-bet-modal-mode-pill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className={mode === 'gram' ? 'text-black font-bold' : 'text-white/60 hover:text-white font-bold'}>
              GRAM
            </span>
          </button>
        </div>

        {/* Тело: Компактный GRAM-ввод или выбор NFT */}
        <div className="relative z-10 bg-white/[0.03] border border-white/[0.06] rounded-[18px] p-3 mb-2.5 flex flex-col items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {mode === 'gram' ? (
            <>
              <div className="w-full flex items-center justify-between px-1 mb-1.5">
                <div className="flex items-center gap-1.5 text-white/50 text-[11px] font-medium">
                  <span>{t('balance')}:</span>
                  <span className="text-white font-bold">{balance.toFixed(2)}</span>
                  <GramIcon className="w-3 h-3 text-brand" />
                </div>
              </div>
              <div className="relative w-full flex items-center justify-center mb-2">
                <div className="px-3.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.10] focus-within:border-[#0098ea] transition-all flex items-center justify-center gap-1.5 shadow-inner">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={betInput}
                    onChange={handleBetChange}
                    className="bg-transparent text-center text-xl font-display font-bold text-white outline-none w-24"
                    placeholder={minBet.toFixed(2)}
                  />
                  <GramIcon className="w-3.5 h-3.5 text-brand shrink-0" />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {[1, 5, 25, 50].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBetAdd(amt)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] font-bold transition-all cursor-pointer"
                  >
                    +{amt}
                  </button>
                ))}
                <button
                  onClick={setBetMax}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#0098ea] to-[#00b4d8] hover:brightness-110 border border-cyan-300/40 text-white text-[11px] font-bold transition-all cursor-pointer shadow-[0_0_8px_rgba(0,152,234,0.35)]"
                >
                  MAX
                </button>
              </div>
            </>
          ) : (
            <div className="w-full">
              <NftSelectorGrid
                inventory={inventory}
                selectedIds={selectedNft ? [selectedNft.uniqueId || selectedNft.id] : []}
                onSelect={(item) => setSelectedNft(item)}
                maxBetGram={maxBet}
                maxContainerHeight="max-h-[250px]"
                emptyText={t('arena_inventory_empty')}
              />
              {selectedNft && (
                <div className="mt-2 text-center text-[12px] font-semibold text-white/45">
                  {t('arena_total')}: <span className="text-white/85 font-bold">{nftValue.toFixed(2)} GRAM</span>
                </div>
              )}
            </div>
          )}
        </div>

        {shownError && (
          <div className="relative z-10 flex items-center gap-2 rounded-[14px] border border-red-500/40 bg-red-500/[0.08] px-3 py-2 mb-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-[12px] font-semibold text-red-400">{shownError}</span>
          </div>
        )}

        <button
          onClick={() => canConfirm && onConfirm(mode === 'gram' ? betGram : 0, mode === 'nft' ? selectedNft : null)}
          disabled={!canConfirm}
          className="relative z-10 w-full font-display font-bold text-[15px] py-3 rounded-xl transition-all shadow-[0_4px_18px_rgba(0,152,234,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? t('arena_sending') : t('arena_confirm')}
        </button>
      </div>
    </div>
  );
};
