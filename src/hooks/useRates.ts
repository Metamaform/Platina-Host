import { useEffect, useState } from 'react';

export interface Rates {
  /** USD price of 1 GRAM (≈ TON spot) */
  gramUsd: number;
  /** USD price of 1 Telegram Star */
  starUsd: number;
  /** GRAM received per 1 Star (after 5% fee) */
  starsToGram: number;
}

const FALLBACK: Rates = { gramUsd: 2.6, starUsd: 0.013, starsToGram: 0.0047 };

/**
 * Live FX rates from the backend (`/api/rates`) instead of the previous
 * hard-coded 0.95 USD/GRAM, which mis-valued every balance on screen.
 */
export function useRates(): Rates {
  const [rates, setRates] = useState<Rates>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/rates')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d && typeof d.gramUsd === 'number') {
            setRates({
              gramUsd: d.gramUsd,
              starUsd: d.starUsd ?? FALLBACK.starUsd,
              starsToGram: d.starsToGram ?? FALLBACK.starsToGram,
            });
          }
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  return rates;
}

export function formatUsd(grams: number, gramUsd: number): string {
  return `$${(grams * gramUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
