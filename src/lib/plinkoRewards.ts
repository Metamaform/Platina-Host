import { getNftBackdrop } from './nftUtils';

export function preparePlinkoRewards(gifts: any[]) {
  return gifts
    .filter(g => getNftBackdrop(g) === 'Default')
    .map(g => ({ ...g, priceVal: Number(g.floor_price_gram || g.price || 0) }))
    .filter(g => Number.isFinite(g.priceVal) && g.priceVal > 0)
    .sort((a, b) => a.priceVal - b.priceVal);
}

export const rewardIdentity = (gift: any): string => String(gift.id || gift.slug || gift.name);

/** Vary the gift, never the payout: its unused value is returned in GRAM.
 * Only use candidates within 5% of the best affordable ordinary NFT.
 * Project-wide profitability must come from an authoritative server, not storage.
 */
export function selectPlinkoReward(sorted: ReturnType<typeof preparePlinkoRewards>, budget: number, previous?: string, random = Math.random) {
  if (!Number.isFinite(budget) || budget <= 0) return null;
  let end = sorted.length - 1;
  while (end >= 0 && sorted[end].priceVal > budget) end--;
  if (end < 0) return null;
  const minimum = sorted[end].priceVal * 0.95;
  let start = end;
  while (start > 0 && sorted[start - 1].priceVal >= minimum) start--;
  const candidates = sorted.slice(start, end + 1);
  const alternatives = candidates.filter(g => rewardIdentity(g) !== previous);
  const pool = alternatives.length ? alternatives : candidates;
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
}
