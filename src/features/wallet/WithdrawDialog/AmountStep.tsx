import React, { useMemo, useState } from 'react';
import { atomicToDecimalString, decimalStringToAtomic, parseAndValidateAmountInput } from '../formatting';
import { validateAmount } from '../validation';
import type { WithdrawalQuote } from '../types';
import { useTranslation } from '../../../lib/i18n';

interface AmountStepProps {
  assetSymbol: string;
  decimals: number;
  availableAtomic: string;
  amountAtomic: string;
  onAmountAtomicChange: (atomic: string) => void;
  amountInput: string;
  onAmountInputChange: (input: string) => void;
  quote: WithdrawalQuote | null;
  quoteLoading: boolean;
  quoteError?: string | null;
  onRequestQuote: () => void;
}

export function AmountStep({
  assetSymbol,
  decimals,
  availableAtomic,
  amountAtomic,
  onAmountAtomicChange,
  amountInput,
  onAmountInputChange,
  quote,
  quoteLoading,
  quoteError,
  onRequestQuote,
}: AmountStepProps) {
  const { t } = useTranslation();
  const availableDisplay = useMemo(() => atomicToDecimalString(availableAtomic, decimals), [availableAtomic, decimals]);

  const feeDisplay = useMemo(() => {
    if (!quote) return '—';
    return atomicToDecimalString(quote.feeAtomic, decimals);
  }, [quote, decimals]);

  const totalDisplay = useMemo(() => {
    if (!quote) return '—';
    return atomicToDecimalString(quote.totalAtomic, decimals);
  }, [quote, decimals]);

  const handleInput = (val: string) => {
    const parsed = parseAndValidateAmountInput(val);
    if (parsed === null) return;
    onAmountInputChange(parsed);
    try {
      if (parsed === '') {
        onAmountAtomicChange('0');
      } else {
        const atomic = decimalStringToAtomic(parsed, decimals);
        onAmountAtomicChange(atomic);
      }
    } catch {
      // ignore
    }
  };

  const handleMax = () => {
    // Max = available - fee if quote exists, otherwise available
    try {
      const available = BigInt(availableAtomic);
      let max = available;
      if (quote) {
        const fee = BigInt(quote.feeAtomic);
        if (available > fee) max = available - fee;
      }
      // Convert to decimal input
      const display = atomicToDecimalString(max.toString(), decimals);
      onAmountInputChange(display);
      onAmountAtomicChange(max.toString());
    } catch {}
  };

  const amountValidation = useMemo(() => {
    if (!amountAtomic || amountAtomic === '0') return null;
    return validateAmount(amountAtomic, availableAtomic, undefined, quote?.feeAtomic);
  }, [amountAtomic, availableAtomic, quote]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-white font-bold text-[16px] mb-3">{t('amount')}</h3>

        <div className="relative bg-white/[0.06] border border-white/10 rounded-2xl p-4 focus-within:border-[#1683FF]/50 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-[28px] font-bold text-white outline-none placeholder-white/20 font-display"
            />
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-[12px] font-bold border border-white/10">{assetSymbol}</span>
              <button
                type="button"
                onClick={handleMax}
                className="px-3 py-1.5 rounded-full bg-[#1683FF] hover:bg-[#1683FF]/90 text-white text-[12px] font-bold transition-colors active:scale-95 cursor-pointer"
              >
                {t('max_short')}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className="text-white/40">{t('available')}: {availableDisplay} {assetSymbol}</span>
            {amountValidation && !amountValidation.valid && (
              <span className="text-red-400 font-medium">{amountValidation.error}</span>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="flex justify-between text-[13px]">
            <span className="text-white/50">{t('network_fee')}</span>
            <span className="text-white font-medium">{quoteLoading ? t('calculating') : `${feeDisplay} ${assetSymbol}`}</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex justify-between text-[13px]">
            <span className="text-white/50">{t('total_debit')}</span>
            <span className="text-white font-bold">{quoteLoading ? '—' : `${totalDisplay} ${assetSymbol}`}</span>
          </div>
          {quote && (
            <div className="text-[11px] text-white/40">
              {t('quote_expires')}: {new Date(quote.expiresAt).toLocaleTimeString()} • {t('quote_fee_fixed')}
            </div>
          )}
        </div>

        {quoteError && (
          <div className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[13px]">
            {quoteError}
          </div>
        )}

        <button
          type="button"
          onClick={onRequestQuote}
          disabled={!amountAtomic || amountAtomic === '0' || !!amountValidation && !amountValidation.valid || quoteLoading}
          className="mt-4 w-full py-3 rounded-2xl lg-glass disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-[14px] transition-all active:scale-[0.98] cursor-pointer"
        >
          {quoteLoading ? t('quote_loading') : quote ? t('quote_refresh') : t('quote_calculate')}
        </button>
      </div>
    </div>
  );
}
