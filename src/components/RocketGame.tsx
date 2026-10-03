import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Rocket, X, Flame, ShieldCheck, History, Users, Settings } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { GramIcon } from './GramIcon';
import { PremiumImage } from './PremiumNftImage';
import { CleanModelLottie } from './ModelCleaningAnimation';
import { BoomIcon } from './ExplosionIcon';
import { multAtTime, RocketBet, ServerRocketState, buildRocketLadder, getRocketReachedGiftFromLadder } from '../lib/rocketShared';
import { cleanNftName, getNftBackdrop } from '../lib/nftUtils';
import { NftSelectorGrid } from './NftSelectorGrid';
import { GameLossModal } from './GameLossModal';
import { BetHistoryModal, BetHistoryRecord } from './BetHistoryModal';
import { GameRoundInfoModal } from './GameRoundInfoModal';
import { LiquidSegment } from './ui/LiquidSegment';

interface NewGameProps {
  onBack: () => void;
  inventory?: any[];
  setInventory?: (inv: any[]) => void;
  balance?: number;
  setBalance?: (b: number | ((prev: number) => number)) => void;
  onTurnover?: (amt: number) => void;
  onWin?: (amt: number, mode: 'gram' | 'nft', item?: any, mult?: number) => void;
  giftsDb?: any[];
  user?: any;
  token?: string | null;
}

export const RocketGame: React.FC<NewGameProps> = ({
  onBack,
  inventory = [],
  setInventory,
  balance = 0,
  setBalance,
  onTurnover,
  onWin,
  giftsDb = [],
  user,
  token
}) => {
  const { t } = useTranslation();

  const effectiveToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('pg_session_token') : null);

  const MAX_BET_GRAM = 2500;

  // Server state synced cyclically 24/7
  const [serverState, setServerState] = useState<ServerRocketState | null>(null);
  const [clockOffset, setClockOffset] = useState<number>(0);

  // Live animated multiplier for smooth 60fps rendering
  const [liveMult, setLiveMult] = useState<number>(1.0);
  const [liveCountdown, setLiveCountdown] = useState<number>(5);
  const multiplierRef = useRef<HTMLSpanElement | null>(null);
  const lastUiFrameRef = useRef(0);
  const displayedRoundRef = useRef<number | null>(null);
  const circleRef = useRef<SVGCircleElement | null>(null);
  const lastCountdownRef = useRef<number>(5);
  const lastMultRef = useRef<number>(1.0);
  const lastStateRef = useRef<string>('waiting');

  // User Bet modal state
  const [showBetModal, setShowBetModal] = useState(false);
  const [mode, setMode] = useState<'gram' | 'nft'>(() => {
    try {
      return (localStorage.getItem('rocket_mode') as 'gram' | 'nft') || 'gram';
    } catch {
      return 'gram';
    }
  });
  const [betInput, setBetInput] = useState<string>(() => {
    try {
      return localStorage.getItem('rocket_bet') || '10';
    } catch {
      return '10';
    }
  });
  const betGram = parseFloat(betInput) || 0;
  
  const [selectedNft, setSelectedNft] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('rocket_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('rocket_bet', betInput);
  }, [betInput]);

  const isInitRef = useRef(false);
  useEffect(() => {
    if (!isInitRef.current) return;
    if (selectedNft) {
      localStorage.setItem('rocket_selectedNftModel', selectedNft.id);
    } else {
      localStorage.removeItem('rocket_selectedNftModel');
    }
  }, [selectedNft]);

  useEffect(() => {
    if (!isInitRef.current) {
      isInitRef.current = true;
      try {
        const savedModel = localStorage.getItem('rocket_selectedNftModel');
        if (savedModel) {
          const item = inventory.find(i => i.id === savedModel && !i.isWithdrawing);
          if (item) {
            setSelectedNft(item);
          }
        }
      } catch {}
    } else {
      // Keep selectedNft only if that specific NFT still exists in inventory; NEVER auto-fill duplicate models!
      setSelectedNft((prev: any) => (prev && inventory.some(i => i.uniqueId === prev.uniqueId && !i.isWithdrawing) ? prev : null));
    }
  }, [inventory]);

  // Current game state (reactive, updated by loop)
  const [currentGameState, setCurrentGameState] = useState<'waiting' | 'flying' | 'crashed'>('waiting');

  // Submitting loading states
  const [isSubmittingBet, setIsSubmittingBet] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Auto-cashout state
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutInput, setAutoCashoutInput] = useState('2.00');
  const [wonResult, setWonResult] = useState<{
    gift?: any;
    winAmount: number;
    remainder?: number;
    multiplier: number;
  } | null>(null);

  // Personal user game history in Rocket (latest 20 games)
  const rocketUserHistoryKey = `rocket_user_history_${user?.id || 'me'}`;
  const [userRocketGames, setUserRocketGames] = useState<BetHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(rocketUserHistoryKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 20);
      }
    } catch {}
    return [];
  });

  const recordRocketUserGame = useCallback((gameItem: any) => {
    setUserRocketGames(prev => {
      const next = [gameItem, ...prev.slice(0, 19)];
      try {
        localStorage.setItem(rocketUserHistoryKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [rocketUserHistoryKey]);

  const [showBetHistory, setShowBetHistory] = useState<boolean>(false);
  const [showRoundInfo, setShowRoundInfo] = useState<boolean>(false);

  const [lossResult, setLossResult] = useState<{
    amount?: number;
    item?: any;
    crashMultiplier: number;
  } | null>(null);

  // Active gifts list with automatic fallback
  const [activeGiftsDb, setActiveGiftsDb] = useState<any[]>(giftsDb || []);

  useEffect(() => {
    if (giftsDb && giftsDb.length > 0) {
      setActiveGiftsDb(giftsDb);
    } else {
      fetch('/api/gifts')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setActiveGiftsDb(data);
          }
        })
        .catch(() => {});
    }
  }, [giftsDb]);

  // Fetch server state
  const fetchState = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (effectiveToken) {
        headers['Authorization'] = `Bearer ${effectiveToken}`;
      }
      const requestedAt = Date.now();
      const res = await fetch('/api/rocket/state', { headers });
      if (!res.ok) return;
      const data: ServerRocketState = await res.json();
      const rawOffset = data.serverTime - (requestedAt + Date.now()) / 2;
      setClockOffset((prev) => (prev === 0 ? rawOffset : prev * 0.7 + rawOffset * 0.3));
      setServerState(data);
    } catch (e) {
      // ignore network hiccup
    }
  }, [effectiveToken]);

  // Periodic polling for cyclical match sync
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 600);
    return () => clearInterval(interval);
  }, [fetchState]);

  // High-frequency animation loop for multiplier & countdown
  useEffect(() => {
    if (!serverState) return;

    let animationFrameId: number;

    const tick = () => {
      const adjustedNow = Date.now() + clockOffset;
      let nextGameState = serverState.state;
      let nextMult = 1.0;

      if (serverState.state === 'waiting') {
        if (adjustedNow < serverState.launchTime) {
          const diff = Math.max(0, serverState.launchTime - adjustedNow);
          const progress = Math.max(0, Math.min(1, diff / 5000));
          if (circleRef.current) {
            circleRef.current.style.strokeDashoffset = `${276.46 * (1 - progress)}`;
          }
          const remaining = Math.min(5, Math.max(1, Math.ceil(diff / 1000)));
          if (remaining !== lastCountdownRef.current) {
            lastCountdownRef.current = remaining;
            setLiveCountdown(remaining);
          }
          nextMult = 1.0;
          nextGameState = 'waiting';
        } else {
          if (circleRef.current) {
            circleRef.current.style.strokeDashoffset = '276.46';
          }
          const elapsed = adjustedNow - serverState.launchTime;
          nextMult = multAtTime(elapsed);
          nextGameState = adjustedNow >= serverState.crashTime ? 'crashed' : 'flying';
        }
      } else if (serverState.state === 'flying') {
        const elapsed = Math.max(0, adjustedNow - serverState.launchTime);
        nextMult = multAtTime(elapsed);
        nextGameState = 'flying';
      } else if (serverState.state === 'crashed') {
        nextMult = serverState.crashMultiplier || serverState.currentMultiplier || 1.0;
        nextGameState = 'crashed';
      }

      // Clock corrections must not make a flying multiplier run backwards.
      const sameRound = displayedRoundRef.current === serverState.roundId;
      if (sameRound && nextGameState === 'flying' && lastStateRef.current === 'flying') {
        nextMult = Math.max(nextMult, lastMultRef.current);
      }
      displayedRoundRef.current = serverState.roundId;
      const multiplierText = `x${nextMult.toFixed(2)}`;
      if (multiplierRef.current && multiplierRef.current.textContent !== multiplierText) {
        multiplierRef.current.textContent = multiplierText;
      }
      const stateChanged = nextGameState !== lastStateRef.current;
      lastMultRef.current = nextMult;
      // The large bet list and NFT catalog don't need a React render every frame.
      if (performance.now() - lastUiFrameRef.current >= 50 || stateChanged || !sameRound) {
        lastUiFrameRef.current = performance.now();
        setLiveMult(nextMult);
      }

      if (nextGameState !== lastStateRef.current) {
        lastStateRef.current = nextGameState;
        setCurrentGameState(nextGameState as any);
      }
      
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, [serverState, clockOffset]);

  // Find active user bet in current round or queued bets
  const userBetInRound = useMemo(() => {
    if (!user || !serverState) return null;
    return serverState.bets.find(b => b.userId === user.id) || null;
  }, [user, serverState]);

  const crashLossNotifiedRoundRef = useRef<number | null>(null);
  useEffect(() => {
    if (serverState?.state === 'crashed' && serverState.roundId !== crashLossNotifiedRoundRef.current) {
      crashLossNotifiedRoundRef.current = serverState.roundId;
      if (userBetInRound && !userBetInRound.hasWon) {
        const crashMult = serverState.crashMultiplier || serverState.currentMultiplier || 1.0;
        const betAmount = userBetInRound.betAmount;
        const gift = userBetInRound.gift;
        const isGram = userBetInRound.isGram;

        const flightTime = Math.max(0, ((serverState.crashTime || Date.now()) - (serverState.launchTime || Date.now())) / 1000);
        recordRocketUserGame({
          id: `${930000 + (serverState.roundId % 70000)}`,
          roundId: serverState.roundId,
          timestamp: Date.now(),
          betAmount,
          mode: isGram ? 'gram' : 'nft',
          gift,
          multiplier: crashMult,
          winAmount: 0,
          isWon: false,
          payoutGram: 0,
          payoutItem: gift?.name || (isGram ? '-' : 'NFT'),
          cashoutType: '-',
          crashMult,
          crashTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          balanceBefore: balance + betAmount,
          balanceAfter: balance
        });

        setTimeout(() => {
          setLossResult({
            amount: isGram ? betAmount : undefined,
            item: gift,
            crashMultiplier: crashMult
          });
        }, 600);
      }
    }
  }, [serverState, userBetInRound]);

  const userBetInQueue = useMemo(() => {
    if (!user || !serverState) return null;
    return serverState.queuedBets.find(b => b.userId === user.id) || null;
  }, [user, serverState]);

  // Sort players in current round according to rules:
  // - If crashed: green winners (hasWon) first, red losers (!hasWon) pushed to the bottom.
  // - If waiting / flying: active players (!hasWon) first, green winners (hasWon) behind active players.
  const sortedDisplayList = useMemo(() => {
    if (!serverState) return [];
    const allBets = [...serverState.bets];

    if (currentGameState === 'crashed') {
      // 1. Зеленые (те кто забрали) становятся ПЕРВЫМИ
      const winners = allBets
        .filter((b) => b.hasWon)
        .sort((a, b) => {
          if (user && a.userId === user.id) return -1;
          if (user && b.userId === user.id) return 1;
          return (Number(b.winAmount || b.betAmount) || 0) - (Number(a.winAmount || a.betAmount) || 0);
        });

      // 2. Красные (проигравшие) опускаются ВНИЗ
      const losers = allBets
        .filter((b) => !b.hasWon)
        .sort((a, b) => {
          if (user && a.userId === user.id) return -1;
          if (user && b.userId === user.id) return 1;
          return (Number(b.betAmount) || 0) - (Number(a.betAmount) || 0);
        });

      return [...winners, ...losers];
    } else {
      // Flying or Waiting:
      // 1. Игроки которые еще остались в игре — ВПЕРЕДИ
      const active = allBets
        .filter((b) => !b.hasWon)
        .sort((a, b) => {
          if (user && a.userId === user.id) return -1;
          if (user && b.userId === user.id) return 1;
          return (Number(b.betAmount) || 0) - (Number(a.betAmount) || 0);
        });

      // 2. Зеленые (те кто уже забрали) — СЗАДИ тех кто еще остался
      const cashedOut = allBets
        .filter((b) => b.hasWon)
        .sort((a, b) => {
          if (user && a.userId === user.id) return -1;
          if (user && b.userId === user.id) return 1;
          return (Number(b.winAmount || b.betAmount) || 0) - (Number(a.winAmount || a.betAmount) || 0);
        });

      return [...active, ...cashedOut];
    }
  }, [serverState, currentGameState, user]);

  // Sorted NFT gifts by floor price ascending
  const sortedGifts = useMemo(() => {
    return [...activeGiftsDb]
      .map((g) => ({
        ...g,
        priceVal: Number(g.floor_price_gram || g.price || 0)
      }))
      .filter((g) => g.priceVal > 0)
      .sort((a, b) => a.priceVal - b.priceVal);
  }, [activeGiftsDb]);

  // Build each price ladder only when the catalog/bets change, not for every
  // player on every animation frame (previously this sorted the whole catalog).
  const giftLadders = useMemo(() => {
    const ladders = new Map<number, any[]>();
    const amounts = [userBetInRound?.betAmount || 0, ...sortedDisplayList.map(b => b.betAmount || 0)];
    for (const amount of amounts) {
      if (!ladders.has(amount)) ladders.set(amount, buildRocketLadder(sortedGifts, amount));
    }
    return ladders;
  }, [sortedGifts, sortedDisplayList, userBetInRound]);

  // Current active bet value in GRAMs (betAmount * liveMult)
  const currentBetValue = useMemo(() => {
    if (!userBetInRound) return 0;
    return Number(((userBetInRound.betAmount || 0) * liveMult).toFixed(2));
  }, [userBetInRound, liveMult]);

  // Resolve reached NFT gift, next target NFT, and remainder in GRAMs (enforcing >= 1 TON gap)
  const { reachedGift, nextGift, remainder: remainderGrams } = useMemo(() => {
    if (!userBetInRound || currentBetValue <= 0) {
      return { reachedGift: null, nextGift: null, remainder: 0 };
    }
    return getRocketReachedGiftFromLadder(giftLadders.get(userBetInRound.betAmount || 0) || [], currentBetValue);
  }, [giftLadders, currentBetValue, userBetInRound]);

  const reachedGiftPrice = reachedGift ? reachedGift.priceVal : 0;
  const nextGiftPrice = nextGift ? nextGift.priceVal : 0;
  const nextGiftMultiplier =
    nextGift && userBetInRound && userBetInRound.betAmount > 0
      ? Number((nextGiftPrice / userBetInRound.betAmount).toFixed(2))
      : 0;

  const progressToNextGift = useMemo(() => {
    if (!nextGift) return 100;
    const base = reachedGift ? reachedGiftPrice : 0;
    const span = nextGiftPrice - base;
    if (span <= 0) return 100;
    return Math.min(100, Math.max(0, ((currentBetValue - base) / span) * 100));
  }, [nextGift, reachedGift, currentBetValue, reachedGiftPrice, nextGiftPrice]);

  // Handle Bet Inputs
  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '.');
    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
      if (val !== '' && parseFloat(val) > MAX_BET_GRAM) {
        setBetInput(MAX_BET_GRAM.toString());
      } else {
        setBetInput(val);
      }
    }
  };

  const setBetAdd = (amt: number) => {
    const cur = parseFloat(betInput) || 0;
    const next = Math.min(Number((cur + amt).toFixed(2)), balance, MAX_BET_GRAM);
    setBetInput(next.toString());
  };

  const setBetMax = () => {
    const max = Math.min(balance, MAX_BET_GRAM);
    setBetInput(max.toFixed(2));
  };

  // Place Bet (calls server)
  const handlePlaceBet = async () => {
    if (isSubmittingBet) return;
    setActionError(null);

    let betValue = 0;
    let betGift: any = null;

    if (mode === 'gram') {
      if (betGram < 0.1 || betGram > balance || betGram > MAX_BET_GRAM) return;
      betValue = Number(betGram.toFixed(2));
    } else {
      if (!selectedNft) return;
      betValue = Number(selectedNft.floor_price_gram || selectedNft.price || 0);
      if (betValue > MAX_BET_GRAM) {
        setActionError(`${t('max_bet_nft')} — ${MAX_BET_GRAM} GRAM`);
        return;
      }
      betGift = selectedNft;
    }

    setIsSubmittingBet(true);
    try {
      const res = await fetch('/api/rocket/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {})
        },
        body: JSON.stringify({
          isGram: mode === 'gram',
          isNft: mode === 'nft',
          betAmount: betValue,
          gift: betGift
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setActionError(data.error || 'Error placing bet');
        return;
      }

      if (typeof data.balance === 'number' && setBalance) {
        setBalance(data.balance);
      }
      if (Array.isArray(data.inventory) && setInventory) {
        setInventory(data.inventory);
      }
      if (onTurnover) {
        onTurnover(betValue);
      }

      if (mode === 'nft') {
        setSelectedNft(null);
        localStorage.removeItem('rocket_selectedNftModel');
      }

      setShowBetModal(false);
      fetchState();
    } catch (e: any) {
      setActionError(e.message || 'Network error');
    } finally {
      setIsSubmittingBet(false);
    }
  };

  // Cashout / Take Win (calls server)
  const handleCashout = async () => {
    if (isCashingOut || !userBetInRound || userBetInRound.hasWon) return;
    setIsCashingOut(true);
    setActionError(null);

    try {
      const res = await fetch('/api/rocket/cashout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {})
        }
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setActionError(data.error || 'Failed to withdraw');
        return;
      }

      if (typeof data.balance === 'number' && setBalance) {
        setBalance(data.balance);
      }
      if (Array.isArray(data.inventory) && setInventory) {
        setInventory(data.inventory);
      }
      if (onWin) {
        onWin(data.winAmount, data.gift ? 'nft' : 'gram', data.gift, data.multiplier);
      }

      setWonResult({
        gift: data.gift,
        winAmount: data.winAmount,
        remainder: data.remainder,
        multiplier: data.multiplier
      });

      const flightTime = Math.max(0, (Date.now() - (serverState?.launchTime || Date.now())) / 1000);
      recordRocketUserGame({
        id: `${930000 + ((serverState?.roundId || 1000) % 70000)}`,
        roundId: serverState?.roundId || 931002,
        timestamp: Date.now(),
        betAmount: userBetInRound.betAmount,
        mode: userBetInRound.isGram ? 'gram' : 'nft',
        gift: data.gift,
        multiplier: data.multiplier,
        winAmount: data.winAmount,
        isWon: true,
        payoutGram: userBetInRound.isGram ? data.winAmount : (data.remainder || 0),
        payoutItem: data.gift?.name || (userBetInRound.isGram ? '-' : 'NFT'),
        cashoutType: t('cashout_manual'),
        cashoutMult: data.multiplier,
        acceptedAt: data.multiplier,
        crashMult: serverState?.crashMultiplier || Number((data.multiplier + 0.8).toFixed(2)),
        balanceBefore: balance,
        balanceAfter: balance + (data.winAmount - userBetInRound.betAmount)
      });

      fetchState();
    } catch (e: any) {
      setActionError(e.message || 'Network error');
    } finally {
      setIsCashingOut(false);
    }
  };

  // Auto-cashout logic
  useEffect(() => {
    if (
      currentGameState === 'flying' && 
      userBetInRound && 
      !userBetInRound.hasWon && 
      autoCashoutEnabled && 
      !isCashingOut
    ) {
      const target = parseFloat(autoCashoutInput);
      if (!isNaN(target) && liveMult >= target) {
        handleCashout();
      }
    }
  }, [liveMult, currentGameState, userBetInRound, autoCashoutEnabled, autoCashoutInput, isCashingOut]);

  // Trajectory Calculations
  const { trajectoryPath, rocketPos, pathColor, glowColor } = useMemo(() => {
    const P0 = { x: 0, y: 1000 };
    const P1 = { x: 300, y: 1000 };
    const P2 = { x: 600, y: 600 };
    const P3 = { x: 650, y: 350 };

    let m = liveMult;
    if (currentGameState === 'crashed') {
      m = serverState?.crashMultiplier || liveMult;
    }
    const t = currentGameState === 'waiting' ? 0 : 1 - (1 / Math.max(1, m));

    // Smooth color interpolation
    const lerpColor = (c1: number[], c2: number[], progress: number) => 
      c1.map((c, i) => Math.round(c + (c2[i] - c) * progress));
    
    const cGreen = [34, 197, 94];
    const cBlue = [59, 130, 246];
    const cYellow = [234, 179, 8];

    let pColor = '';
    let gColor = '';

    if (m < 1.2) {
      // Red (< 1.2x)
      pColor = 'rgb(239, 68, 68)';
      gColor = 'rgba(239, 68, 68, 0.6)';
    } else if (m < 3.0) {
      // Green (1.2x to 3x)
      pColor = `rgb(${cGreen.join(',')})`;
      gColor = `rgba(${cGreen.join(',')}, 0.6)`;
    } else if (m < 8.0) {
      // Blue (3x to 8x)
      pColor = `rgb(${cBlue.join(',')})`;
      gColor = `rgba(${cBlue.join(',')}, 0.6)`;
    } else {
      // Yellow (8x+)
      pColor = `rgb(${cYellow.join(',')})`;
      gColor = `rgba(${cYellow.join(',')}, 0.6)`;
    }

    const dx = 3 * Math.pow(1 - t, 2) * (P1.x - P0.x) +
               6 * (1 - t) * t * (P2.x - P1.x) +
               3 * Math.pow(t, 2) * (P3.x - P2.x);
    const dy = 3 * Math.pow(1 - t, 2) * (P1.y - P0.y) +
               6 * (1 - t) * t * (P2.y - P1.y) +
               3 * Math.pow(t, 2) * (P3.y - P2.y);
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    if (t <= 0.001) {
      return { 
        trajectoryPath: '', 
        rocketPos: { x: P0.x, y: P0.y, angle: angleDeg },
        pathColor: pColor,
        glowColor: gColor
      };
    }

    const q0 = { x: P0.x + (P1.x - P0.x) * t, y: P0.y + (P1.y - P0.y) * t };
    const q1 = { x: P1.x + (P2.x - P1.x) * t, y: P1.y + (P2.y - P1.y) * t };
    const q2 = { x: P2.x + (P3.x - P2.x) * t, y: P2.y + (P3.y - P2.y) * t };
    const r0 = { x: q0.x + (q1.x - q0.x) * t, y: q0.y + (q1.y - q0.y) * t };
    const r1 = { x: q1.x + (q2.x - q1.x) * t, y: q1.y + (q2.y - q1.y) * t };
    const s0 = { x: r0.x + (r1.x - r0.x) * t, y: r0.y + (r1.y - r0.y) * t };

    return {
      trajectoryPath: `M ${P0.x} ${P0.y} C ${q0.x} ${q0.y}, ${r0.x} ${r0.y}, ${s0.x} ${s0.y}`,
      rocketPos: { x: s0.x, y: s0.y, angle: angleDeg },
      pathColor: pColor,
      glowColor: gColor
    };
  }, [liveMult, currentGameState, serverState?.crashMultiplier]);

  const liveWinAmount = userBetInRound
    ? (userBetInRound.betAmount * liveMult).toFixed(2)
    : '0.00';

  const currentAffordableNft = reachedGift;

  return (
    <div className="h-full w-full flex flex-col bg-canvas text-white relative select-none">
      <button
        id="rocket-back-button"
        onClick={onBack}
        className="absolute top-4 left-4 w-9 h-9 rounded-full lg-glass flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer z-20"
        title={t('back')}
      >
        <ArrowLeft className="w-4 h-4 text-white" />
      </button>

      <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-center pointer-events-none z-10">
        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">
          {t('new_game')}
        </h1>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <div className="flex items-center gap-1.5 lg-glass px-3 h-9 rounded-full">
          <span className="text-white font-bold text-[13px]">{balance.toFixed(2)}</span>
          <GramIcon className="w-3.5 h-3.5 text-brand" />
        </div>
        <button
          onClick={() => setShowBetHistory(true)}
          className="w-9 h-9 rounded-full lg-glass flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer"
          title={t('bet_history_title')}
        >
          <History className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-[72px] custom-scrollbar">
        <div className="max-w-md mx-auto flex flex-col items-center">

          {/* Fixed Non-scrollable Multipliers Line (нельзя листать) */}
          {serverState?.history && serverState.history.length > 0 && (
            <div className="w-full flex items-center gap-1.5 overflow-hidden select-none pointer-events-none py-1 mb-3">
              {serverState.history.slice(0, 6).map((hMult, idx) => (
                <div
                  key={idx}
                  className={`flex-1 text-center py-1.5 px-0.5 rounded-xl text-[12px] font-bold border transition-colors ${
                    hMult >= 8.0
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                      : hMult >= 3.0
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : hMult >= 1.2
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : hMult < 1.2
                      ? 'bg-red-500/15 text-red-500 border-red-500/30'
                      : 'bg-white/5 text-white/50 border-white/10'
                  }`}
                >
                  x{hMult.toFixed(2)}
                </div>
              ))}
            </div>
          )}

          {/* Rocket Flight Screen / Visualizer */}
          <div className="w-full relative min-h-[250px] mb-4">
            {/* Background container with rounded corners and liquid glass style */}
            <div className="absolute inset-0 rounded-[28px] bg-white/[0.06] backdrop-blur-2xl border border-white/[0.10] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_18px_45px_-16px_rgba(0,0,0,0.85)] pointer-events-none">
              {/* верхний блик жидкого стекла */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
              />
              {/* Ambient Background Glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

              {/* Center Area: Waiting rocket or flying/crashed rocket */}
              <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <svg 
                  className="w-full h-full pointer-events-none" 
                  viewBox="0 0 1000 1000" 
                  preserveAspectRatio="none"
                >
                  <defs>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {currentGameState !== 'waiting' && trajectoryPath && (
                    <path
                      d={trajectoryPath}
                      fill="none"
                      stroke={pathColor}
                      strokeWidth="16"
                      strokeLinecap="round"
                      filter="url(#neon-glow)"
                      className="transition-colors duration-300"
                    />
                  )}
                </svg>
              </div>

              {/* Explosion Effect */}
              <AnimatePresence>
                {currentGameState === 'crashed' && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 1, rotate: -30 }}
                    animate={{ scale: [1.5, 1], opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", damping: 10, stiffness: 300, duration: 0.2 }}
                    className="absolute z-20 pointer-events-none drop-shadow-[0_4px_25px_rgba(239,68,68,0.8)]"
                    style={{ left: `calc(${rocketPos.x / 10}% - 5rem)`, top: `calc(${rocketPos.y / 10}% - 5rem)`, width: '10rem', height: '10rem' }}
                  >
                    <img src="/telegram-boom.svg" className="w-full h-full object-contain" alt="Boom" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Absolutely Positioned Rocket */}
              <div 
                className={`absolute z-10 w-28 h-28 flex items-center justify-center transition-all ${
                  currentGameState === 'waiting' ? 'opacity-0 scale-50 duration-500' :
                  currentGameState === 'crashed' ? 'opacity-0 scale-0 duration-[200ms] ease-out' : 
                  'opacity-100 scale-100 duration-[100ms] ease-linear'
                }`}
                style={{
                  left: `calc(${rocketPos.x / 10}% - 3.5rem)`, 
                  top: `calc(${rocketPos.y / 10}% - 3.5rem)`,
                  transform: `rotate(${rocketPos.angle + 45}deg)`,
                }}
              >
                <CleanModelLottie
                  lottieUrl="/stellarrocket-1-nobg.lottie.json"
                  loop={currentGameState === 'flying'}
                  staticMode={currentGameState === 'crashed'}
                  className="w-full h-full drop-shadow-[0_4px_25px_rgba(245,158,11,0.35)]"
                />
              </div>
            </div>

            {/* Everything else placed over the background container, without overflow-hidden! */}

            {/* Status Pill */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full ${
                currentGameState === 'flying' ? 'bg-green-400 animate-ping' :
                currentGameState === 'crashed' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
              }`} />
              <span className="text-[9px] font-bold tracking-wider uppercase text-white/70">
                {currentGameState === 'waiting' ? t('start_in') :
                 currentGameState === 'flying' ? t('flying') : t('crashed')}
              </span>
            </div>

            {/* Round Number */}
            <div className="absolute top-4 right-4 z-10 flex items-center justify-center bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 text-[9px] font-bold tracking-wider text-white/70 uppercase">
              #{serverState?.roundId || 1}
            </div>

            {/* Centered Multiplier and Countdown */}
            <div className={`absolute inset-x-0 ${currentGameState === 'waiting' ? 'top-1/2 -translate-y-1/2' : 'top-8'} z-10 flex flex-col items-center pointer-events-none transition-all duration-500`}>
              <AnimatePresence>
                {currentGameState === 'waiting' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                    className="relative w-24 h-24 flex items-center justify-center pointer-events-none"
                  >
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                      {/* Background track circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        className="stroke-white/10 fill-none"
                        strokeWidth="5"
                      />
                      {/* Smooth progress circle */}
                      <circle
                        ref={circleRef}
                        cx="50"
                        cy="50"
                        r="44"
                        className="stroke-brand fill-none"
                        strokeWidth="5"
                        strokeDasharray={276.46}
                        strokeDashoffset={276.46 * (1 - Math.max(0, Math.min(1, (serverState?.launchTime ? Math.max(0, serverState.launchTime - (Date.now() + clockOffset)) : 5000) / 5000)))}
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 8px rgba(255, 184, 0, 0.7))',
                          willChange: 'stroke-dashoffset',
                        }}
                      />
                    </svg>
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={liveCountdown}
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="text-4xl font-display font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10"
                      >
                        {liveCountdown}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {currentGameState !== 'waiting' && (
                  <motion.span
                    ref={multiplierRef}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`font-display font-black tabular-nums tracking-tight drop-shadow-md transition-colors z-10 ${
                      currentGameState === 'crashed' 
                        ? 'text-4xl text-red-500' 
                        : liveMult < 1.2 
                          ? 'text-5xl text-red-500'
                          : liveMult < 3.0
                            ? 'text-5xl text-emerald-400'
                            : liveMult < 8.0
                              ? 'text-5xl text-brand'
                              : 'text-5xl text-yellow-400'
                    }`}
                  />
                )}
              </AnimatePresence>

              {/* Display Winnable NFT */}
              <AnimatePresence mode="popLayout">
                {currentGameState === 'flying' && currentAffordableNft && (() => {
                  const nftBackdrop = getNftBackdrop(currentAffordableNft);
                  const isOnyx = nftBackdrop === 'Onyx Black';
                  const isBlack = nftBackdrop === 'Black';

                  return (
                    <motion.div 
                      key={currentAffordableNft.name}
                      initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)', position: 'absolute' }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-3 flex flex-col items-center justify-center"
                    >
                      <PremiumImage
                        src={currentAffordableNft.lottie_url || currentAffordableNft.image_url} 
                        alt={currentAffordableNft.name}
                        className="w-[68px] h-[68px] object-contain"
                        staticMode={true}
                      />
                      {(isOnyx || isBlack) && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 px-2.5 py-0.5 rounded-full text-[#c7c7cc] ${
                          isOnyx 
                            ? 'bg-[#35393a]/90 border border-white/20' 
                            : 'bg-black/90 border border-white/15'
                        }`}>
                          {isOnyx ? 'Onyx Black' : 'Black'}
                        </span>
                      )}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>

          {/* Action Error notification if any */}
          {actionError && (
            <div className="w-full p-2.5 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center rounded-xl font-medium">
              {actionError}
            </div>
          )}

          {/* Action Button */}
          {currentGameState === 'flying' && userBetInRound && !userBetInRound.hasWon ? (
            <button
              id="rocket-cashout-button"
              onClick={handleCashout}
              disabled={isCashingOut}
              className="w-full relative overflow-hidden group rounded-2xl font-display font-bold text-[17px] tracking-wide transition-transform py-4 shadow-[0_4px_24px_rgba(16,185,129,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] bg-gradient-to-r from-[#10b981] via-[#059669] to-[#10b981] hover:brightness-110 text-white disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 select-none"
            >
              {isCashingOut ? (
                <span>{t('withdrawing')}</span>
              ) : reachedGift ? (
                <div className="flex items-center justify-center gap-2 pointer-events-none">
                  <span>{t('take')}</span>
                  <div className="relative h-6 overflow-hidden flex items-center pointer-events-none">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={reachedGift.id || reachedGift.slug || reachedGift.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="inline-block truncate max-w-[140px] pointer-events-none"
                      >
                        {cleanNftName(reachedGift.name)}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  {remainderGrams > 0 && (
                    <span className="bg-black/20 text-black px-2 py-0.5 rounded-full text-xs font-black tabular-nums pointer-events-none">
                      +{remainderGrams.toFixed(2)} G
                    </span>
                  )}
                </div>
              ) : (
                <span className="pointer-events-none">{t('take')} {liveWinAmount} GRAM</span>
              )}
            </button>
          ) : (
            <button
              id="rocket-make-bet-button"
              onClick={() => setShowBetModal(true)}
              disabled={isSubmittingBet || !!userBetInQueue}
              className="w-full relative overflow-hidden group rounded-2xl font-display font-bold text-[17px] tracking-wide transition-transform py-4 primary-button text-white disabled:opacity-40 cursor-pointer shadow-lg"
            >
              {userBetInQueue
                ? t('rocket_next_round_accepted')
                : userBetInRound && userBetInRound.hasWon
                ? t('rocket_win_taken')
                : userBetInRound && currentGameState === 'waiting'
                ? t('rocket_bet_accepted').replace('{amount}', userBetInRound.betAmount.toString())
                : currentGameState === 'flying'
                ? t('rocket_bet_next_round')
                : t('rocket_place_bet')}
            </button>
          )}

          {/* 
            ========================================================================
            BOTTOM PANEL: PLAYERS IN MATCH
            ========================================================================
          */}
          <div className="w-full mt-7 flex flex-col gap-3 pb-8">
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white/50" />
                <span className="text-white font-bold text-xs">
                  {t('players_list')} ({sortedDisplayList.length})
                </span>
              </div>
            </div>

            {sortedDisplayList.length === 0 ? (
              <div className="w-full py-8 px-4 text-center rounded-[24px] bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col items-center justify-center">
                <span className="text-white/40 text-sm font-medium">
                  {t('rocket_no_bets')}
                </span>
                <span className="text-white/20 text-xs mt-1">{t('rocket_be_first')}</span>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {sortedDisplayList.map((open) => {
                  const isMyBet = !!user && open.userId === user.id;
                  const isWon = !!open.hasWon;
                  const isLost = currentGameState === 'crashed' && !open.hasWon;
                  const isFlyingActive = currentGameState === 'flying' && !open.hasWon;
                  const isNftWin = !open.isGram && !!open.gift;
                  const exactMult = open.multiplier || 1.0;
                  const multStr = exactMult.toFixed(2);

                  let winAmount = Number(open.winAmount || open.betAmount || 0).toFixed(2);
                  if (isNftWin && open.gift) {
                    winAmount = Number(open.gift.price || open.gift.floor_price_gram || open.winAmount || 0).toFixed(2);
                  }
                  const betAmount = Number(open.betAmount || 0).toFixed(2);

                  // Live bet calculations while in flight
                  const currentLiveValue = Number(((open.betAmount || 0) * liveMult).toFixed(2));
                  const { reachedGift: liveNft } = getRocketReachedGiftFromLadder(isFlyingActive ? giftLadders.get(open.betAmount || 0) || [] : [], currentLiveValue);

                  return (
                    <motion.div
                      layout
                      layoutDependency={sortedDisplayList}
                      key={open.id}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className={`flex items-center justify-between rounded-[22px] p-3 transition-colors duration-300 ${
                        isWon
                          ? 'border border-emerald-500/80 bg-emerald-950/20'
                          : isLost
                          ? 'border border-red-500/80 bg-red-950/20'
                          : 'border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={open.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${open.firstName || undefined}`}
                          alt=""
                          className="w-10 h-10 rounded-full bg-white/5 shrink-0 object-cover border border-white/10"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-medium text-[15px] truncate max-w-[120px]">
                              {open.firstName}
                            </span>
                            {isMyBet && (
                              <span className="text-[10px] bg-white/10 text-white/90 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                {t('you')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-white/50 mt-0.5">
                            {open.isNft ? (
                              <span>{t('bet_nft')}</span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <GramIcon className="w-3 h-3 text-white/40" /> {betAmount}
                              </span>
                            )}
                            <span>•</span>
                            <span className={isWon ? 'text-emerald-400 font-semibold' : isLost ? 'text-red-400 font-semibold' : 'text-white/60'}>
                              x{isWon ? multStr : isFlyingActive ? liveMult.toFixed(2) : isLost ? multStr : '1.00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right-side outcome / live bet / prize */}
                      {isWon ? (
                        open.gift ? (
                          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-2.5 py-1.5">
                            <PremiumImage
                              staticMode={true}
                              src={open.gift.image_url}
                              alt={open.gift.name}
                              className="w-8 h-8 object-contain shrink-0"
                            />
                            <div className="flex flex-col items-end justify-center">
                              <div className="flex items-center gap-1 text-emerald-400 font-display font-bold text-[14px] leading-tight">
                                <span>+{winAmount}</span>
                                <GramIcon className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                              <span className="text-[10px] text-emerald-300 truncate max-w-[85px] text-right">
                                {cleanNftName(open.gift.baseName || open.gift.name)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end justify-center px-2 py-1">
                            <div className="flex items-center gap-1 text-emerald-400 font-display font-bold text-[15px] leading-tight">
                              <span>+{winAmount}</span>
                              <GramIcon className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <span className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
                              x{multStr}
                            </span>
                          </div>
                        )
                      ) : isLost ? (
                        <div className="flex flex-col items-end justify-center px-2 py-1">
                          <div className="flex items-center gap-1 text-red-400 font-display font-bold text-[15px] leading-tight">
                            <span>-{betAmount}</span>
                            <GramIcon className="w-3.5 h-3.5 text-red-400" />
                          </div>
                          <span className="text-[10px] text-red-400/70 font-medium mt-0.5">
                            x{multStr}
                          </span>
                        </div>
                      ) : isFlyingActive ? (
                        liveNft ? (
                          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-2.5 py-1.5">
                            <PremiumImage
                              staticMode={true}
                              src={liveNft.image_url}
                              alt={liveNft.name}
                              className="w-8 h-8 object-contain shrink-0"
                            />
                            <div className="flex flex-col items-end justify-center">
                              <div className="flex items-center gap-1 text-white font-display font-bold text-[14px] leading-tight">
                                <span>+{currentLiveValue.toFixed(2)}</span>
                                <GramIcon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] text-white/60 truncate max-w-[85px] text-right">
                                {cleanNftName(liveNft.baseName || liveNft.name)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end justify-center px-2 py-1">
                            <div className="flex items-center gap-1 text-white font-display font-bold text-[15px] leading-tight">
                              <span>+{currentLiveValue.toFixed(2)}</span>
                              <GramIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] text-white/40 mt-0.5">
                              x{liveMult.toFixed(2)}
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-end justify-center px-2 py-1">
                          <div className="flex items-center gap-1 text-white/80 font-display font-bold text-[14px] leading-tight">
                            <span>{betAmount}</span>
                            <GramIcon className="w-3.5 h-3.5 text-white/50" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Bet Modal */}
      <AnimatePresence>
        {showBetModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBetModal(false)}
              onTouchEnd={() => setShowBetModal(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="group fixed bottom-0 left-0 right-0 z-[110] bg-[#16171b]/98 backdrop-blur-2xl rounded-t-[24px] px-4 pt-3 pb-5 flex flex-col shadow-2xl border-t border-white/[0.12] max-w-md mx-auto overflow-hidden"
            >
              {/* верхний блик жидкого стекла */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-t-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
              />

              <div className="relative z-10 flex items-center justify-between mb-2.5">
                <div className="w-7" />
                <h2 className="text-[15px] font-display font-bold text-white text-center">
                  {currentGameState === 'flying' ? t('rocket_bet_next_round') : (t('make_bet_title') || t('rocket_place_bet'))}
                </h2>
                <button 
                  onClick={() => setShowBetModal(false)}
                  className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="relative z-10 mb-2.5 w-full flex rounded-xl bg-white/[0.04] p-0.5 border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setMode('nft')}
                  className="relative flex-1 py-1 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer z-10"
                >
                  {mode === 'nft' && (
                    <motion.div
                      layoutId="rocket-bet-mode-pill"
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
                  onClick={() => setMode('gram')}
                  className="relative flex-1 py-1 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer z-10"
                >
                  {mode === 'gram' && (
                    <motion.div
                      layoutId="rocket-bet-mode-pill"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={mode === 'gram' ? 'text-black font-bold' : 'text-white/60 hover:text-white font-bold'}>
                    GRAM
                  </span>
                </button>
              </div>

              {/* Mode Body: Compact GRAM or NFT Picker */}
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
                    <div className="relative w-full text-center flex items-center justify-center mb-2">
                      <div className="px-3.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.10] focus-within:border-[#0098ea] transition-all flex items-center justify-center gap-1.5 shadow-inner">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={betInput}
                          onChange={handleBetChange}
                          className="bg-transparent text-center text-xl font-display font-bold text-white outline-none w-24"
                          placeholder="0.1"
                        />
                        <GramIcon className="w-3.5 h-3.5 text-brand shrink-0" />
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-center">
                      {[1, 5, 25, 50].map(amt => (
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

                    {/* Auto-Cashout Settings (compact) */}
                    <div className="flex items-center gap-2.5 w-full mt-2 bg-white/[0.03] border border-white/[0.06] rounded-[12px] py-1.5 px-2.5">
                      <div 
                        className="flex items-center gap-2 cursor-pointer select-none"
                        onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
                      >
                        <div className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${autoCashoutEnabled ? 'bg-brand' : 'bg-white/20'}`}>
                          <div className={`w-3 h-3 bg-black/80 rounded-full transition-transform duration-300 ease-out shadow-sm ${autoCashoutEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-white/80 text-[11px] font-bold">{t('rocket_auto_withdraw')}</span>
                      </div>
                      <div className={`flex-1 flex items-center justify-end transition-opacity ${autoCashoutEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <span className="text-white/40 text-[11px] font-medium mr-1.5">x</span>
                        <div className="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-0.5 flex items-center">
                          <input 
                            type="text" 
                            inputMode="decimal"
                            value={autoCashoutInput}
                            onChange={(e) => setAutoCashoutInput(e.target.value.replace(/,/g, '.'))}
                            className="bg-transparent text-right text-[11px] font-bold text-white outline-none w-10"
                            placeholder="2.00"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full">
                    <NftSelectorGrid
                      inventory={inventory}
                      selectedIds={selectedNft ? [selectedNft.uniqueId || selectedNft.id] : []}
                      onSelect={(item) => setSelectedNft(item)}
                      maxBetGram={2500}
                      maxContainerHeight="max-h-[250px]"
                      emptyText={t('inventory_empty')}
                    />
                  </div>
                )}
              </div>

              {/* Confirm Button */}
              <button
                id="rocket-confirm-bet-button"
                onClick={handlePlaceBet}
                disabled={
                  isSubmittingBet ||
                  (mode === 'gram' && (betGram < 0.1 || betGram > balance || betGram > MAX_BET_GRAM)) ||
                  (mode === 'nft' && (!selectedNft || Number(selectedNft.floor_price_gram || selectedNft.price || 0) > 2500))
                }
                className="w-full font-display font-bold text-[15px] py-3 rounded-xl transition-all shadow-[0_4px_18px_rgba(0,152,234,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmittingBet ? 'Placing...' : t('rocket_place_bet')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Celebration Modal when user cashes out */}
      <AnimatePresence>
        {wonResult && (
          <div 
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md px-6 cursor-pointer select-none"
            onClick={() => setWonResult(null)}
            onTouchEnd={(e) => {
              if (e.target === e.currentTarget) {
                setWonResult(null);
              }
            }}
          >
            {/* Dedicated full screen click capture backdrop */}
            <div 
              className="absolute inset-0 cursor-pointer" 
              onClick={() => setWonResult(null)} 
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[290px] flex flex-col gap-2.5 mx-auto p-4 rounded-[28px] relative z-10 transition-all duration-300 shadow-2xl border border-[#3b82f6]/20 bg-[#16181d] shadow-[0_4px_20px_-10px_rgba(59,130,246,0.1)] cursor-default"
            >
              <div className="w-full flex justify-between items-center relative mb-1">
                <span className="text-[14px] font-black text-[#22c55e] uppercase tracking-wider">
                  {t('rocket_cashout_success')}
                </span>
                <button 
                  type="button"
                  onClick={() => setWonResult(null)} 
                  className="w-8 h-8 rounded-full lg-glass flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer z-30"
                  title={t('close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {wonResult.gift ? (
                <div className="relative overflow-hidden w-full aspect-square rounded-[20px] flex flex-col items-center p-1 transition-all duration-300">
                  <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-2">
                    <PremiumImage 
                      staticMode={false} 
                      loopWithDelay={true} 
                      loopDelayMs={5000} 
                      src={wonResult.gift.image_url} 
                      alt={wonResult.gift.name} 
                      className="w-[85%] h-[85%] object-contain drop-shadow-lg" 
                    />
                  </div>
                  <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0 pb-1.5 px-1">
                    {(() => {
                      const giftBackdrop = getNftBackdrop(wonResult.gift);
                      const isOnyx = giftBackdrop === 'Onyx Black';
                      const isBlack = giftBackdrop === 'Black';

                      return (
                        <>
                          {(isOnyx || isBlack) && (
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-1 text-[#c7c7cc] ${
                              isOnyx 
                                ? 'bg-[#35393a]/90 border border-white/20' 
                                : 'bg-black/90 border border-white/15'
                            }`}>
                              {isOnyx ? 'Onyx Black' : 'Black'}
                            </span>
                          )}
                          <span className="text-[14px] text-white/90 w-full text-center font-bold leading-tight line-clamp-2">
                            {cleanNftName(wonResult.gift.baseName || wonResult.gift.name)}
                          </span>
                        </>
                      );
                    })()}
                    <span className="text-[15px] font-bold text-brand flex items-center justify-center gap-1 mt-1">{Number(wonResult.gift.price || wonResult.gift.floor_price_gram || 0).toFixed(2)} <GramIcon className="w-4 h-4" /></span>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden w-full aspect-square rounded-[20px] flex flex-col items-center p-1 transition-all duration-300 justify-center">
                  <div className="w-20 h-20 rounded-full bg-brand/10 border-2 border-brand/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,184,0,0.25)] mb-4">
                    <GramIcon className="w-10 h-10 text-brand" />
                  </div>
                  <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0 pb-1.5 px-1">
                    <span className="text-[14px] text-white/60 w-full text-center font-medium leading-tight line-clamp-2">{t('win_amount')} (x{wonResult.multiplier.toFixed(2)})</span>
                    <span className="text-[24px] font-bold text-brand flex items-center justify-center gap-1 mt-1">+{wonResult.winAmount.toFixed(2)} <GramIcon className="w-5 h-5 text-brand" /></span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 w-full mt-1">
                <div className="flex flex-col gap-1 px-2 py-1.5 mb-1 text-[12px] font-medium border-t border-white/5 pt-2">
                  {wonResult.remainder && wonResult.remainder > 0 ? (
                    <div className="flex justify-between items-center text-[#22c55e]">
                      <span>{t('win_remainder')}:</span>
                      <span className="flex items-center gap-1 font-bold">
                        +{wonResult.remainder.toFixed(2)} <GramIcon className="w-3 h-3" />
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center text-white/60">
                    <span>{t('current_balance')}:</span>
                    <span className="text-white flex items-center gap-1 font-bold">
                      {balance.toFixed(2)} <GramIcon className="w-3 h-3 text-brand" />
                    </span>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setWonResult(null)}
                  className="w-full py-3.5 rounded-[16px] text-[14px] font-bold flex items-center justify-center bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] text-white hover:brightness-110 transition-all cursor-pointer shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]"
                >
                  {t('great')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Defeat modal removed as requested */}
      {/* <GameLossModal
        isOpen={Boolean(lossResult)}
        onClose={() => setLossResult(null)}
        onRetry={() => {
          setLossResult(null);
          setShowBetModal(true);
        }}
        game="rocket"
        crashMultiplier={lossResult?.crashMultiplier}
      /> */}

      {/* Bet History Modal matching IMG_0888 */}
      <BetHistoryModal
        isOpen={showBetHistory}
        onClose={() => setShowBetHistory(false)}
        title={t('bet_history_title')}
        history={userRocketGames}
      />

      {/* Game Round Info Modal (gear icon) */}
      <GameRoundInfoModal
        isOpen={showRoundInfo}
        onClose={() => setShowRoundInfo(false)}
        game="rocket"
        roundId={serverState?.roundId}
        balance={balance}
        timeoutSec={serverState?.state === 'waiting' && serverState?.remainingWaitingMs ? Number((serverState.remainingWaitingMs / 1000).toFixed(1)) : 5.0}
        maxPrize={100000}
        minBet={0.1}
        maxBet={7000}
        statusText={
          serverState?.state === 'flying'
            ? `${t('rocket_flying_status')} 🚀`
            : serverState?.state === 'crashed'
            ? `${t('crashed_at_multiplier')} x${(serverState?.crashMultiplier || 1.0).toFixed(2)}`
            : t('waiting_players')
        }
      />
    </div>
  );
};

export const NewGame = RocketGame;
