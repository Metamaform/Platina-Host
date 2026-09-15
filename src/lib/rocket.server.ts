import { getUser, saveUserState, recordOpen, getGiftsConfig } from './store.server.ts';
import type { RocketBet } from './rocketShared.ts';
import { multAtTime, flightDurationForMult } from './rocketShared.ts';

export interface RocketRound {
  id: number;
  state: 'waiting' | 'flying' | 'crashed';
  roundStartTime: number;
  launchTime: number;
  crashTime: number;
  nextRoundTime: number;
  crashMultiplier: number;
  bets: RocketBet[];
  queuedBets: RocketBet[];
  history: number[];
}

const WAITING_DURATION_MS = 5000; // 5s countdown to launch (5 to 1)
const CRASHED_PAUSE_MS = 3000;    // 3s result pause

export function generateCrashMultiplier(): number {
  const rand = Math.random();
  if (rand < 0.035) return 1.0; // 3.5% instant crash at 1.00x
  // 96% RTP curve
  let mult = 0.96 / (1.0 - rand * 0.95);
  mult = Math.max(1.01, Math.min(80.0, mult));
  return Number(mult.toFixed(2));
}

function initRound(id: number, history: number[] = []): RocketRound {
  const now = Date.now();
  const crashMultiplier = generateCrashMultiplier();
  const flightDuration = flightDurationForMult(crashMultiplier);
  const launchTime = now + WAITING_DURATION_MS;
  const crashTime = launchTime + flightDuration;
  const nextRoundTime = crashTime + CRASHED_PAUSE_MS;

  return {
    id,
    state: 'waiting',
    roundStartTime: now,
    launchTime,
    crashTime,
    nextRoundTime,
    crashMultiplier,
    bets: [],
    queuedBets: [],
    history
  };
}

// Global Singleton continuous game engine
let currentRound: RocketRound = initRound(1, [1.45, 2.18, 1.08, 3.50, 1.82, 5.12, 1.20, 2.90]);

export function tickRocketEngine() {
  const now = Date.now();

  if (now < currentRound.launchTime) {
    currentRound.state = 'waiting';
  } else if (now < currentRound.crashTime) {
    currentRound.state = 'flying';
  } else if (now < currentRound.nextRoundTime) {
    if (currentRound.state !== 'crashed') {
      currentRound.state = 'crashed';
      // Record crash in recent history
      currentRound.history.unshift(currentRound.crashMultiplier);
      if (currentRound.history.length > 20) {
        currentRound.history.pop();
      }
    }
  } else {
    // Start next round in the continuous 24/7 cycle
    const nextId = currentRound.id + 1;
    const history = [...currentRound.history];
    const queued = [...currentRound.queuedBets];

    currentRound = initRound(nextId, history);
    // Move any queued bets into the newly started round
    currentRound.bets = queued.map(b => ({ ...b, queued: false, id: `bet-${nextId}-${b.userId}` }));
  }
}

// Start recurring tick timer on module load so rounds continue 24/7
setInterval(tickRocketEngine, 100);

export function getRocketState(userId?: number) {
  tickRocketEngine();
  const now = Date.now();
  let currentMultiplier = 1.0;

  if (currentRound.state === 'flying') {
    const elapsed = Math.max(0, now - currentRound.launchTime);
    currentMultiplier = multAtTime(elapsed);
    if (currentMultiplier > currentRound.crashMultiplier) {
      currentMultiplier = currentRound.crashMultiplier;
    }
  } else if (currentRound.state === 'crashed') {
    currentMultiplier = currentRound.crashMultiplier;
  }

  return {
    roundId: currentRound.id,
    state: currentRound.state,
    launchTime: currentRound.launchTime,
    crashTime: currentRound.crashTime,
    nextRoundTime: currentRound.nextRoundTime,
    currentMultiplier,
    crashMultiplier: currentRound.state === 'crashed' ? currentRound.crashMultiplier : undefined,
    remainingWaitingMs: Math.max(0, currentRound.launchTime - now),
    serverTime: now,
    bets: currentRound.bets, // ONLY real people
    queuedBets: currentRound.queuedBets,
    history: currentRound.history
  };
}

export function placeRocketBet(
  userId: number,
  isGram: boolean,
  isNft: boolean,
  betAmount: number,
  gift?: any
) {
  tickRocketEngine();
  const user = getUser(userId);
  if (!user) {
    return { error: 'User not found' };
  }

  // Check if user already placed a bet in this round
  const existingInRound = currentRound.bets.find(b => b.userId === userId);
  const existingInQueue = currentRound.queuedBets.find(b => b.userId === userId);
  if (existingInRound || existingInQueue) {
    return { error: 'Bet for this round already placed' };
  }

  // Validate balance or NFT
  let validatedBetAmount = betAmount;
  let validatedGift = gift;

  if (isGram) {
    if (betAmount < 0.1) {
      return { error: 'Minimum bet 0.1 GRAM' };
    }
    if (betAmount > 2500) {
      return { error: 'Maximum bet 2500 GRAM' };
    }
    if (betAmount > user.balance) {
      return { error: 'Insufficient balance' };
    }
    const newBalance = Number((user.balance - betAmount).toFixed(2));
    const newTurnover = (user.turnover || 0) + betAmount;
    saveUserState(userId, newBalance, user.inventory, newTurnover, user.topups);
  } else {
    // NFT Bet
    if (!gift) return { error: 'NFT item not selected' };
    const invItem = user.inventory.find((i: any) => 
      (gift.uniqueId && i.uniqueId === gift.uniqueId) || (i.id === gift.id)
    );
    if (!invItem) return { error: 'Item not found in inventory' };

    validatedGift = invItem;
    validatedBetAmount = Number(invItem.floor_price_gram || invItem.price || 0);

    const newInventory = user.inventory.filter((i: any) => i.uniqueId !== invItem.uniqueId);
    const newTurnover = (user.turnover || 0) + validatedBetAmount;
    saveUserState(userId, user.balance, newInventory, newTurnover, user.topups);
  }

  const isQueued = currentRound.state !== 'waiting';
  const newBet: RocketBet = {
    id: `bet-${currentRound.id}-${userId}`,
    userId,
    firstName: user.firstName || 'Player',
    username: user.username,
    photoUrl: user.photoUrl,
    isGram,
    isNft,
    betAmount: validatedBetAmount,
    gift: validatedGift,
    multiplier: 1.0,
    hasWon: false,
    timestamp: Date.now(),
    queued: isQueued
  };

  if (isQueued) {
    currentRound.queuedBets.push(newBet);
  } else {
    currentRound.bets.push(newBet);
  }

  const updatedUser = getUser(userId);
  return {
    ok: true,
    bet: newBet,
    isQueued,
    balance: updatedUser?.balance || 0,
    inventory: updatedUser?.inventory || []
  };
}

export function cashoutRocketBet(userId: number) {
  tickRocketEngine();
  const now = Date.now();

  if (currentRound.state !== 'flying' || now >= currentRound.crashTime) {
    return { error: 'Rocket already flew away!' };
  }

  const bet = currentRound.bets.find(b => b.userId === userId && !b.hasWon);
  if (!bet) {
    return { error: 'Active bet not found or already withdrawn' };
  }

  const elapsed = Math.max(0, now - currentRound.launchTime);
  const winMultiplier = multAtTime(elapsed);

  if (winMultiplier >= currentRound.crashMultiplier) {
    return { error: 'Rocket already flew away!' };
  }

  const user = getUser(userId);
  if (!user) return { error: 'User not found' };

  let winAmount = Number((bet.betAmount * winMultiplier).toFixed(2));
  let wonGift: any = undefined;
  let remainder = 0;

  const giftsDb: any[] = getGiftsConfig() || [];
  const affordableGifts = giftsDb
    .filter((g: any) => {
      const p = Number(g.floor_price_gram || g.price || 0);
      return p > 0 && p <= winAmount;
    })
    .sort((a: any, b: any) => {
      const pa = Number(a.floor_price_gram || a.price || 0);
      const pb = Number(b.floor_price_gram || b.price || 0);
      return pb - pa;
    });

  const bestNft = affordableGifts[0];

  if (bestNft) {
    const nftPrice = Number(bestNft.floor_price_gram || bestNft.price || 0);
    wonGift = {
      ...bestNft,
      uniqueId: Math.random().toString(36).substr(2, 9),
      price: nftPrice
    };
    const updatedInv = [...(user.inventory || []), wonGift];
    remainder = Number((winAmount - nftPrice).toFixed(2));
    const updatedBal = remainder > 0 ? Number((user.balance + remainder).toFixed(2)) : user.balance;
    saveUserState(userId, updatedBal, updatedInv, user.turnover, user.topups);
  } else {
    // If winAmount is below the cheapest NFT in the store, all winnings go directly to GRAM balance
    const updatedBal = Number((user.balance + winAmount).toFixed(2));
    saveUserState(userId, updatedBal, user.inventory || [], user.turnover, user.topups);
  }

  // Update bet status
  bet.hasWon = true;
  bet.multiplier = winMultiplier;
  bet.winAmount = winAmount;
  bet.remainder = remainder;
  bet.cashedOutAt = now;
  if (wonGift) bet.gift = wonGift;

  // Record live open
  recordOpen({
    id: `rocket-${Date.now()}-${userId}`,
    ts: new Date().toISOString(),
    firstName: user.firstName || 'Player',
    price: winAmount,
    isGram: !wonGift,
    gift: wonGift || (bet.isNft ? bet.gift : undefined),
    multiplier: winMultiplier
  });

  const updatedUser = getUser(userId);
  return {
    ok: true,
    winAmount,
    multiplier: winMultiplier,
    gift: wonGift,
    remainder,
    balance: updatedUser?.balance || 0,
    inventory: updatedUser?.inventory || []
  };
}
