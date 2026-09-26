export interface RocketBet {
  id: string;
  userId: number;
  firstName: string;
  username?: string;
  photoUrl?: string;
  isGram: boolean;
  isNft: boolean;
  betAmount: number;
  gift?: any;
  multiplier?: number;
  hasWon?: boolean;
  winAmount?: number;
  remainder?: number;
  cashedOutAt?: number;
  timestamp: number;
  queued?: boolean;
}

export interface ServerRocketState {
  roundId: number;
  state: 'waiting' | 'flying' | 'crashed';
  launchTime: number;
  crashTime: number;
  nextRoundTime: number;
  currentMultiplier: number;
  crashMultiplier?: number;
  remainingWaitingMs: number;
  serverTime: number;
  bets: RocketBet[];
  queuedBets: RocketBet[];
  history: number[];
}

export function multAtTime(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1.0;
  const t = elapsedMs / 1000;
  // Exponential multiplier curve: ~1.00 at 0s, 1.49 at 5s, 2.22 at 10s, 4.95 at 20s
  return Math.max(1.0, Number(Math.pow(Math.E, 0.08 * t).toFixed(2)));
}

export function flightDurationForMult(mult: number): number {
  if (mult <= 1.0) return 0;
  const t = Math.log(mult) / 0.08;
  return Math.round(t * 1000);
}

/**
 * Builds the progression ladder of NFTs for a Rocket round.
 * Requirements:
 * - On cheap gifts (< 50 GRAM): gap >= 1.0 GRAM so remainder reaches up to 1 GRAM before transitioning.
 * - On expensive gifts (>= 50 GRAM): gap >= 3.0 GRAM so remainder reaches up to 3 GRAM/TON when prices are close.
 */
export function buildRocketLadder(gifts: any[], baseBetAmount: number = 0): any[] {
  if (!gifts || gifts.length === 0) return [];

  // Normalize and sort gifts by price ascending
  const sorted = [...gifts]
    .map(g => ({
      ...g,
      priceVal: Number(g.floor_price_gram || g.price || 0)
    }))
    .filter(g => g.priceVal > 0)
    .sort((a, b) => a.priceVal - b.priceVal);

  if (sorted.length === 0) return [];

  // Determine starting anchor: if baseBetAmount is provided, find the closest gift <= baseBetAmount (or the cheapest)
  let startIdx = 0;
  if (baseBetAmount > 0) {
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].priceVal <= baseBetAmount) {
        startIdx = i;
        break;
      }
    }
  }

  const ladder: any[] = [];
  ladder.push(sorted[startIdx]);

  for (let i = startIdx + 1; i < sorted.length; i++) {
    const candidate = sorted[i];
    const prev = ladder[ladder.length - 1];
    // Dynamic gap: 1.0 GRAM for cheap gifts (< 50 GRAM), and 3.0 GRAM for expensive gifts (>= 50 GRAM)
    const minGap = prev.priceVal >= 50 ? 3.0 : 1.0;
    if (candidate.priceVal >= prev.priceVal + minGap) {
      ladder.push(candidate);
    }
  }

  return ladder;
}

/**
 * Resolves current reached gift, next gift, and remainder for an active rocket win amount.
 */
export function getRocketReachedGift(
  gifts: any[],
  winAmount: number,
  baseBetAmount: number = 0
): { reachedGift: any | null; nextGift: any | null; remainder: number } {
  if (!gifts || gifts.length === 0 || winAmount <= 0) {
    return { reachedGift: null, nextGift: null, remainder: Number(winAmount.toFixed(2)) };
  }

  const ladder = buildRocketLadder(gifts, baseBetAmount);
  if (ladder.length === 0) {
    return { reachedGift: null, nextGift: null, remainder: Number(winAmount.toFixed(2)) };
  }

  // Find the highest reached gift in the ladder where priceVal <= winAmount
  let reachedGift: any = null;
  let reachedIndex = -1;

  for (let i = ladder.length - 1; i >= 0; i--) {
    if (ladder[i].priceVal <= winAmount) {
      reachedGift = ladder[i];
      reachedIndex = i;
      break;
    }
  }

  const nextGift = (reachedIndex >= 0 && reachedIndex + 1 < ladder.length)
    ? ladder[reachedIndex + 1]
    : (reachedIndex === -1 ? ladder.find(g => g.priceVal > winAmount) || ladder[0] : null);

  const remainder = reachedGift
    ? Math.max(0, Number((winAmount - reachedGift.priceVal).toFixed(2)))
    : Number(winAmount.toFixed(2));

  return { reachedGift, nextGift, remainder };
}

