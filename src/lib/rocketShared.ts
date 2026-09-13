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
