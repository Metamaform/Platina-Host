import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, QrCode } from 'lucide-react';

interface WalletBalanceCardProps {
  balanceAtomic?: string; // optional atomic string for formatting? We'll receive formatted fiat for now
  fiatAmount: string; // e.g. "9999.99" or "0"
  currency?: 'USD' | 'EUR';
  onTogglePrivacy?: (hidden: boolean) => void;
  isPrivacyDefaultHidden?: boolean;
  loading?: boolean;
}

/**
 * Financial pattern component - low opacity icons
 */
function FinancialPattern() {
  return (
    <div className="wallet-card__pattern absolute inset-0 opacity-[0.10] pointer-events-none" aria-hidden="true">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="financial-pattern" x="0" y="0" width="180" height="120" patternUnits="userSpaceOnUse">
            {/* Piggy bank simplified */}
            <g opacity="0.7">
              <text x="10" y="30" fontSize="28" fontFamily="system-ui" fill="white">$</text>
              <text x="60" y="25" fontSize="20" fill="white">BUY</text>
              <text x="110" y="35" fontSize="22" fill="white">◊</text>
              <text x="20" y="80" fontSize="24" fill="white">₿</text>
              <text x="70" y="85" fontSize="18" fill="white">◍</text>
              <text x="120" y="80" fontSize="20" fill="white">$</text>
            </g>
            {/* Additional icons as simple shapes */}
            <circle cx="45" cy="55" r="12" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
            <rect x="100" y="55" width="22" height="16" rx="3" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#financial-pattern)" />
      </svg>
      {/* More elaborate CSS-based pattern overlay */}
      <div className="absolute inset-0 opacity-[0.6] mix-blend-overlay">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
      </div>
    </div>
  );
}

export function WalletBalanceCard({ fiatAmount, currency = 'USD', loading }: WalletBalanceCardProps) {
  const storageKey = 'wallet_balance_hidden';
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, hidden ? '1' : '0');
    } catch {}
  }, [hidden]);

  const displayBalance = hidden ? '•••••' : (currency === 'USD' ? `$${Number(fiatAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${fiatAmount} ${currency}`);

  // Skeleton
  if (loading) {
    return (
      <div className="wallet-card relative overflow-hidden rounded-[36px] min-h-[290px] w-full bg-[#1a1a1d] animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-[#AA80EE] via-[#AD9ADE] to-[#67CEEA] opacity-30" />
        <div className="relative z-[1] min-h-[290px] grid place-items-center">
          <div className="w-40 h-16 bg-white/20 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-card relative overflow-hidden rounded-[36px] min-h-[290px] w-full shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] select-none">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(145deg, #AA80EE 0%, #AD9ADE 44%, #67CEEA 100%)',
        }}
      />
      {/* Pattern layer */}
      <FinancialPattern />

      {/* Content */}
      <div className="wallet-card__content relative z-[1] min-h-[290px] flex flex-col items-center justify-center px-6 py-14 text-white">
        {/* Privacy toggle */}
        <button
          type="button"
          aria-label={hidden ? 'Показать баланс' : 'Скрыть баланс'}
          aria-pressed={hidden}
          onClick={() => setHidden((v) => !v)}
          className="absolute right-4 top-4 w-11 h-11 rounded-full bg-black/15 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/25 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>

        {/* Balance */}
        <div
          className="font-display font-bold leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.25)] text-center"
          style={{
            fontWeight: 800,
            fontSize: 'clamp(56px, 12vw, 96px)',
            letterSpacing: '-0.03em',
          }}
        >
          {hidden ? '••••' : displayBalance}
        </div>

        {/* Bottom brand block */}
        <div className="absolute bottom-5 inset-x-0 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-white text-[22px] font-bold tracking-tight drop-shadow-sm">Platina</span>
            <QrCode className="w-[22px] h-[22px] text-white" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="text-white/80 text-[11px] font-bold uppercase tracking-[0.2em]">Multichain Wallet</div>
        </div>
      </div>
    </div>
  );
}
