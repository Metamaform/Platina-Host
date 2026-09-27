import React from 'react';
import { GramIcon } from '../../components/GramIcon';

interface PremiumCardCarouselProps {
  /** Баланс в граммах, отображаемый на карте BLACK */
  balance?: number;
}

function GlowBlack() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]" aria-hidden="true">
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/[0.12] rounded-full blur-[50px]" />
      <div className="absolute top-0 right-20 w-40 h-40 bg-white/[0.08] rounded-full blur-[30px]" />
    </div>
  );
}

/**
 * Блок «Мои карты» — одна карта BLACK с балансом в граммах.
 */
export function PremiumCardCarousel({ balance = 0 }: PremiumCardCarouselProps) {
  const value = Number(balance) || 0;
  const displayBalance = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="w-full">
      <div className="mb-3 px-1">
        <h2 className="font-display text-[18px] font-bold text-white tracking-tight">Мои карты</h2>
      </div>

      <div className="relative w-full min-h-[200px] rounded-[32px] border overflow-hidden select-none bg-[#070708] border-white/15 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]">
        {/* Background effects */}
        <GlowBlack />

        {/* Content */}
        <div className="relative z-10 p-5 flex flex-col h-full min-h-[200px]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <span className="font-display text-white/90 text-[20px] font-bold tracking-tight">Platina</span>
            <span className="px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-wider bg-white/[0.06] border-white/15 text-white/60">
              BLACK
            </span>
          </div>

          {/* Balance in grams */}
          <div className="flex-1 flex flex-col justify-center">
            <div
              className="flex items-center justify-center gap-[0.14em] font-display font-bold text-white leading-none tracking-tight drop-shadow-sm"
              style={{ fontWeight: 800, fontSize: 'clamp(40px, 9.5vw, 58px)', letterSpacing: '-0.03em' }}
              aria-label={`Баланс: ${displayBalance} грамм`}
            >
              <span className="whitespace-nowrap">{displayBalance}</span>
              <GramIcon className="h-[0.4em] w-[0.4em] mb-[0.07em] drop-shadow-md" />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6">
            <span className="text-white/60 text-[14px] font-medium tracking-wide">Multichain</span>
          </div>
        </div>
      </div>
    </div>
  );
}
