import React from 'react';
import { atomicToDecimalString, shortenAddress } from '../formatting';
import type { WithdrawDraft, WithdrawalQuote } from '../types';

interface ReviewStepProps {
  draft: WithdrawDraft;
  quote: WithdrawalQuote;
  assetDecimals: number;
  assetSymbol: string;
  explorerUrl?: string;
}

export function ReviewStep({ draft, quote, assetDecimals, assetSymbol, explorerUrl }: ReviewStepProps) {
  const amountDisplay = atomicToDecimalString(draft.amountAtomic, assetDecimals);
  const feeDisplay = atomicToDecimalString(quote.feeAtomic, assetDecimals);
  const totalDisplay = atomicToDecimalString(quote.totalAtomic, assetDecimals);

  return (
    <div className="space-y-5">
      <h3 className="text-white font-bold text-[16px]">Проверка</h3>

      <div className="rounded-2xl bg-white/[0.04] border border-white/10 divide-y divide-white/5 overflow-hidden">
        <div className="p-4 flex justify-between gap-4">
          <span className="text-white/50 text-[13px]">Актив</span>
          <span className="text-white font-semibold text-[14px]">{draft.asset}</span>
        </div>
        <div className="p-4 flex justify-between gap-4">
          <span className="text-white/50 text-[13px]">Сеть</span>
          <span className="text-white font-semibold text-[14px]">{draft.network}</span>
        </div>
        <div className="p-4 flex justify-between gap-4">
          <span className="text-white/50 text-[13px]">Адрес</span>
          <span className="text-white font-mono text-[13px] font-medium" title={draft.destination}>
            {shortenAddress(draft.destination, 10, 8)}
          </span>
        </div>
        <div className="p-4 flex justify-between gap-4">
          <span className="text-white/50 text-[13px]">Сумма</span>
          <span className="text-white font-bold text-[14px]">{amountDisplay} {assetSymbol}</span>
        </div>
        <div className="p-4 flex justify-between gap-4">
          <span className="text-white/50 text-[13px]">Комиссия</span>
          <span className="text-white text-[14px]">{feeDisplay} {assetSymbol}</span>
        </div>
        <div className="p-4 flex justify-between gap-4 bg-white/[0.02]">
          <span className="text-white font-semibold text-[14px]">Итого</span>
          <span className="text-white font-bold text-[15px]">{totalDisplay} {assetSymbol}</span>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[12px] leading-relaxed">
        ⚠️ Внимание: перевод необратим. Проверьте сеть и адрес получателя. Средства, отправленные на неверный адрес или в неподдерживаемой сети, будут утеряны безвозвратно.
      </div>

      {explorerUrl && (
        <div className="text-[11px] text-white/40">
          После подтверждения вы сможете отслеживать транзакцию в обозревателе: {explorerUrl}
        </div>
      )}
    </div>
  );
}
