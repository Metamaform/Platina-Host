import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Rocket, X, Flame } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { GramIcon } from './GramIcon';
import { PremiumImage } from './PremiumImage';
import { CleanModelLottie } from './CleanModelLottie';
import { multAtTime, RocketBet, ServerRocketState } from '../lib/rocketShared';

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

export const NewGame: React.FC<NewGameProps> = ({
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
  const [liveCountdown, setLiveCountdown] = useState<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(5000);

  // User Bet modal state
  const [showBetModal, setShowBetModal] = useState(false);
  const [mode, setMode] = useState<'gram' | 'nft'>('gram');
  const [betInput, setBetInput] = useState<string>('10');
  const betGram = parseFloat(betInput) || 0;
  const [selectedNft, setSelectedNft] = useState<any>(null);

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
      const res = await fetch('/api/rocket/state', { headers });
      if (!res.ok) return;
      const data: ServerRocketState = await res.json();
      const offset = data.serverTime - Date.now();
      setClockOffset(offset);
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

    const animTimer = setInterval(() => {
      const adjustedNow = Date.now() + clockOffset;

      if (serverState.state === 'waiting') {
        if (adjustedNow < serverState.launchTime) {
          const diff = Math.max(0, serverState.launchTime - adjustedNow);
          setRemainingMs(diff);
          const remaining = Math.min(5, Math.max(1, Math.ceil(diff / 1000)));
          setLiveCountdown(remaining);
          setLiveMult(1.0);
        } else {
          setRemainingMs(0);
          const elapsed = adjustedNow - serverState.launchTime;
          setLiveMult(multAtTime(elapsed));
        }
      } else if (serverState.state === 'flying') {
        setRemainingMs(0);
        const elapsed = Math.max(0, adjustedNow - serverState.launchTime);
        const calculated = multAtTime(elapsed);
        setLiveMult(calculated);
      } else if (serverState.state === 'crashed') {
        setRemainingMs(0);
        setLiveMult(serverState.crashMultiplier || serverState.currentMultiplier || 1.0);
      }
    }, 50);

    return () => clearInterval(animTimer);
  }, [serverState, clockOffset]);

  // Find active user bet in current round or queued bets
  const userBetInRound = useMemo(() => {
    if (!user || !serverState) return null;
    return serverState.bets.find(b => b.userId === user.id) || null;
  }, [user, serverState]);

  const userBetInQueue = useMemo(() => {
    if (!user || !serverState) return null;
    return serverState.queuedBets.find(b => b.userId === user.id) || null;
  }, [user, serverState]);

  // Current game state (reactive)
  const currentGameState = useMemo(() => {
    if (!serverState) return 'waiting';
    const adjustedNow = Date.now() + clockOffset;
    if (serverState.state === 'waiting' && adjustedNow >= serverState.launchTime) {
      if (adjustedNow >= serverState.crashTime) {
        return 'crashed';
      }
      return 'flying';
    }
    return serverState.state;
  }, [serverState, clockOffset, liveCountdown, liveMult]);

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

  // Current active bet value in GRAMs (betAmount * liveMult)
  const currentBetValue = useMemo(() => {
    if (!userBetInRound) return 0;
    return Number(((userBetInRound.betAmount || 0) * liveMult).toFixed(2));
  }, [userBetInRound, liveMult]);

  // Highest priced reached NFT gift <= currentBetValue
  const reachedGift = useMemo(() => {
    if (!userBetInRound || currentBetValue <= 0) return null;
    const reached = sortedGifts.filter((g) => g.priceVal <= currentBetValue);
    return reached.length > 0 ? reached[reached.length - 1] : null;
  }, [sortedGifts, currentBetValue, userBetInRound]);

  const reachedGiftPrice = reachedGift ? reachedGift.priceVal : 0;
  const remainderGrams = reachedGift
    ? Math.max(0, Number((currentBetValue - reachedGiftPrice).toFixed(2)))
    : currentBetValue;

  // Next target NFT gift
  const nextGift = useMemo(() => {
    if (!userBetInRound) return null;
    return sortedGifts.find((g) => g.priceVal > currentBetValue) || null;
  }, [sortedGifts, currentBetValue, userBetInRound]);

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
    const next = Math.min(cur + amt, balance, MAX_BET_GRAM);
    setBetInput(next.toString());
  };

  const setBetMax = () => {
    const max = Math.min(balance, MAX_BET_GRAM);
    setBetInput(max.toString());
  };

  // Place Bet (calls server)
  const handlePlaceBet = async () => {
    if (isSubmittingBet) return;
    setActionError(null);

    let betValue = 0;
    let betGift: any = null;

    if (mode === 'gram') {
      if (betGram < 0.1 || betGram > balance || betGram > MAX_BET_GRAM) return;
      betValue = betGram;
    } else {
      if (!selectedNft) return;
      betValue = Number(selectedNft.floor_price_gram || selectedNft.price || 0);
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
        setActionError(data.error || 'Ошибка размещения ставки');
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

      setShowBetModal(false);
      fetchState();
    } catch (e: any) {
      setActionError(e.message || 'Ошибка сети');
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
        setActionError(data.error || 'Не удалось забрать выигрыш');
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

      fetchState();
    } catch (e: any) {
      setActionError(e.message || 'Ошибка сети');
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
    const P3 = { x: 800, y: 250 };

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

  const currentAffordableNft = useMemo(() => {
    // Only check if user has placed a bet (no demo mode)
    const activeWinAmount = userBetInRound 
      ? (userBetInRound.betAmount * liveMult) 
      : 0;

    if (activeWinAmount <= 0) return null;
    
    const affordableGifts = (activeGiftsDb || [])
      .filter((g: any) => {
        const p = Number(g.floor_price_gram || g.price || 0);
        return p > 0 && p <= activeWinAmount;
      })
      .sort((a: any, b: any) => {
        const pa = Number(a.floor_price_gram || a.price || 0);
        const pb = Number(b.floor_price_gram || b.price || 0);
        return pb - pa;
      });
      
    return affordableGifts[0] || null;
  }, [userBetInRound, liveMult, activeGiftsDb]);

  return (
    <div className="h-full w-full flex flex-col bg-canvas text-white relative select-none">
      {/* Top Header Bar */}
      <div className="relative h-[72px] flex items-center justify-between px-4 z-20 shrink-0 border-b border-white/5">
        <button
          id="rocket-back-button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-all hover:bg-white/20 border border-white/5 cursor-pointer"
          title={t('back') || 'Назад'}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">
          {t('new_game') || 'Ракетка'}
        </h1>

        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <span className="text-white font-bold text-[13px]">{balance.toFixed(2)}</span>
          <GramIcon className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 custom-scrollbar">
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
          <div className="w-full relative min-h-[250px] rounded-[28px] bg-gradient-to-b from-[#181820] to-[#121216] border border-white/10 overflow-hidden flex flex-col items-center justify-center p-5 shadow-2xl mb-4">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Status Pill */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className={`w-2 h-2 rounded-full ${
                currentGameState === 'flying' ? 'bg-green-400 animate-ping' :
                currentGameState === 'crashed' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
              }`} />
              <span className="text-[11px] font-bold tracking-wider uppercase text-white/70">
                {currentGameState === 'waiting' ? `Старт через ${liveCountdown}с` :
                 currentGameState === 'flying' ? 'В полете' : 'Краш'}
              </span>
            </div>

            {/* Round Number */}
            <div className="absolute top-4 right-4 z-10 text-[11px] text-white/40 font-medium bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
              #{serverState?.roundId || 1}
            </div>

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

            {/* Absolutely Positioned Rocket */}
            <div 
              className={`absolute z-10 w-28 h-28 flex items-center justify-center transition-all ${
                currentGameState === 'waiting' ? 'opacity-0 scale-50 duration-500' :
                currentGameState === 'crashed' ? 'opacity-35 grayscale scale-90 duration-[300ms]' : 
                'opacity-100 scale-100 duration-[100ms] ease-linear'
              }`}
              style={{
                left: `calc(${rocketPos.x / 10}% - 3.5rem)`, 
                top: `calc(${rocketPos.y / 10}% - 3.5rem)`,
                transform: `rotate(${rocketPos.angle + 45}deg)`,
              }}
            >
              <CleanModelLottie
                lottieUrl="https://nft.fragment.com/gift/stellarrocket-1.lottie.json"
                loop={currentGameState === 'flying'}
                staticMode={currentGameState === 'crashed'}
                className="w-full h-full drop-shadow-[0_4px_25px_rgba(245,158,11,0.35)]"
              />
            </div>

            {/* Centered Multiplier and Countdown */}
            <div className={`relative z-10 flex flex-col items-center justify-center h-full pointer-events-none transition-all duration-300 ${currentGameState === 'flying' && currentAffordableNft ? '-mt-6' : ''}`}>
              <AnimatePresence>
                {currentGameState === 'waiting' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="absolute w-44 h-44 flex items-center justify-center pointer-events-none"
                  >
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none scale-110" viewBox="0 0 176 176">
                      <circle
                        cx="88"
                        cy="88"
                        r="78"
                        className="stroke-brand fill-none transition-all duration-100 ease-linear"
                        strokeWidth="4"
                        strokeDasharray={490}
                        strokeDashoffset={490 * (1 - Math.max(0, Math.min(1, remainingMs / 5000)))}
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 6px rgba(255, 184, 0, 0.6))'
                        }}
                      />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              <span className={`font-display font-black tracking-tight drop-shadow-md transition-colors z-10 ${
                currentGameState === 'crashed' 
                  ? 'text-4xl text-red-500' 
                  : liveMult < 1.2 
                    ? 'text-5xl text-red-500'
                    : liveMult < 3.0
                      ? 'text-5xl text-emerald-400'
                      : 'text-5xl text-brand'
              }`}>
                x{(currentGameState === 'crashed' ? (serverState?.crashMultiplier || liveMult) : liveMult).toFixed(2)}
              </span>
              
              {currentGameState === 'crashed' && (
                <span className="text-xs text-red-400/90 font-semibold mt-1">Ракета улетела!</span>
              )}

              {/* Display Winnable NFT */}
              <AnimatePresence mode="popLayout">
                {currentGameState === 'flying' && currentAffordableNft && (
                  <motion.div 
                    key={currentAffordableNft.name}
                    initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.15, filter: 'blur(8px)', position: 'absolute' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-3 flex flex-col items-center justify-center"
                  >
                    <PremiumImage
                      src={currentAffordableNft.lottie_url || currentAffordableNft.image_url} 
                      alt={currentAffordableNft.name}
                      className="w-24 h-24 object-contain drop-shadow-[0_8px_20px_rgba(255,255,255,0.15)]"
                      staticMode={true}
                    />
                  </motion.div>
                )}
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
              className="w-full relative overflow-hidden group rounded-[20px] font-display font-bold text-[17px] tracking-wide active:scale-[0.98] transition-all py-4 bg-brand text-black shadow-[0_0_30px_rgba(255,184,0,0.35)] animate-pulse disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isCashingOut ? (
                'Вывод...'
              ) : reachedGift ? (
                <div className="flex items-center justify-center gap-2">
                  <span>Забрать</span>
                  <div className="relative h-6 overflow-hidden flex items-center">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={reachedGift.id || reachedGift.slug || reachedGift.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="inline-block truncate max-w-[140px]"
                      >
                        {reachedGift.name}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  {remainderGrams > 0 && (
                    <span className="bg-black/20 text-black px-2 py-0.5 rounded-full text-xs font-black tabular-nums">
                      +{remainderGrams.toFixed(2)} G
                    </span>
                  )}
                </div>
              ) : (
                `Забрать ${liveWinAmount} GRAM`
              )}
            </button>
          ) : (
            <button
              id="rocket-make-bet-button"
              onClick={() => setShowBetModal(true)}
              disabled={isSubmittingBet || !!userBetInQueue}
              className="w-full relative overflow-hidden group rounded-[20px] font-display font-bold text-[18px] tracking-wide active:scale-[0.98] transition-all py-4 shadow-[0_0_30px_rgba(255,184,0,0.3)] bg-brand text-black disabled:opacity-50 cursor-pointer"
            >
              {userBetInQueue
                ? 'Ставка на след. раунд принята'
                : userBetInRound && userBetInRound.hasWon
                ? 'Выигрыш забран! Поставить еще'
                : userBetInRound && currentGameState === 'waiting'
                ? `Ставка ${userBetInRound.betAmount} GRAM принята`
                : currentGameState === 'flying'
                ? 'Сделать ставку на след. раунд'
                : 'Сделать ставку'}
            </button>
          )}

          {/* 
            ========================================================================
            BOTTOM PANEL: PLAYERS IN MATCH (MINES STYLE CARDS, NEUTRAL STYLING)
            ========================================================================
          */}
          <div className="w-full mt-7 flex flex-col gap-3 pb-8">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
                Список игроков
              </span>
              <span className="text-white/40 text-[11px] font-medium">
                ({sortedDisplayList.length})
              </span>
            </div>

            {sortedDisplayList.length === 0 ? (
              <div className="w-full py-8 px-4 text-center rounded-[24px] bg-[#1c1c20] border border-white/5 flex flex-col items-center justify-center">
                <span className="text-white/40 text-sm font-medium">
                  В этом матче пока нет ставок
                </span>
                <span className="text-white/20 text-xs mt-1">
                  Сделайте ставку первым!
                </span>
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

                  return (
                    <motion.div
                      layout
                      key={open.id}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex items-center justify-between rounded-[24px] p-3 bg-[#1c1c20] border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={open.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${open.firstName || undefined}`}
                          alt=""
                          className="w-10 h-10 rounded-full bg-white/5 shrink-0 object-cover border border-white/5"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-medium text-[15px] truncate max-w-[100px]">
                              {open.firstName}
                            </span>
                            {isMyBet && (
                              <span className="text-[10px] bg-brand/20 text-brand px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                Вы
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 opacity-60">
                            {open.isNft ? (
                              <span className="text-[12px] font-medium">{t('bet_nft')}</span>
                            ) : (
                              <>
                                <GramIcon className="w-3.5 h-3.5" />
                                <span className="text-[12px] font-medium">{betAmount}</span>
                              </>
                            )}
                            <span className="text-[12px]">
                              x{isWon ? multStr : isFlyingActive ? liveMult.toFixed(2) : isLost ? multStr : '1.00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right-side outcome / prize */}
                      {isNftWin && open.gift ? (
                        <div className="flex items-center gap-3 bg-black/20 rounded-[16px] pr-4 p-1.5 border border-white/5">
                          <PremiumImage
                            staticMode={true}
                            src={open.gift.image_url}
                            alt={open.gift.name}
                            className="w-10 h-10 object-contain drop-shadow-md"
                          />
                          <div className="flex flex-col items-end justify-center">
                            <span className="text-brand font-bold text-[14px] leading-none mb-1 flex items-center gap-1">
                              {winAmount} <GramIcon className="w-3 h-3" />
                            </span>
                            <span className="text-[10px] text-white/50 leading-none truncate max-w-[80px] text-right">
                              {open.gift.name}
                            </span>
                          </div>
                        </div>
                      ) : isWon ? (
                        <div className="flex items-center gap-1.5 text-success font-display text-[16px] font-bold">
                          +{winAmount} <GramIcon className="w-4 h-4 text-success" />
                        </div>
                      ) : isLost ? (
                        <div className="flex items-center gap-1 text-white/40 font-display text-[15px] font-bold px-2 py-1">
                          <span className="line-through decoration-white/25">-{betAmount}</span>
                          <GramIcon className="w-3.5 h-3.5 text-white/30" />
                        </div>
                      ) : isFlyingActive ? (
                        <div className="flex items-center gap-1 text-white font-display text-[15px] font-bold px-2 py-1">
                          <GramIcon className="w-3.5 h-3.5 text-brand" /> {betAmount}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-white/80 font-display text-[15px] font-bold px-2 py-1">
                          <GramIcon className="w-3.5 h-3.5 text-brand/70" /> {betAmount}
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
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[110] bg-[#1a1a20] rounded-t-[32px] p-5 pb-8 flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.6)] border-t border-white/10 max-w-md mx-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-8" />
                <h2 className="text-[20px] font-display font-bold text-white text-center">
                  {currentGameState === 'flying' ? 'Ставка на след. раунд' : (t('make_bet_title') || 'Сделать ставку')}
                </h2>
                <button
                  onClick={() => setShowBetModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Toggle: Подарки / GRAM */}
              <div className="flex p-1 bg-black/20 rounded-2xl mb-6">
                <button
                  onClick={() => setMode('nft')}
                  className={`flex-1 py-2.5 rounded-[12px] font-medium text-[15px] transition-all cursor-pointer ${
                    mode === 'nft' ? 'bg-brand text-black shadow-sm' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  Подарки
                </button>
                <button
                  onClick={() => setMode('gram')}
                  className={`flex-1 py-2.5 rounded-[12px] font-medium text-[15px] transition-all cursor-pointer ${
                    mode === 'gram' ? 'bg-brand text-black shadow-sm' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  GRAM
                </button>
              </div>

              {/* Mode Body: GRAM or NFT Picker */}
              <div className="bg-[#222228] rounded-[24px] p-6 mb-6 flex flex-col items-center justify-center min-h-[120px] border border-white/5 relative">
                {mode === 'gram' ? (
                  <>
                    <div className="absolute top-4 left-5 flex items-center gap-1 text-white/50 text-[12px] font-medium">
                      <span>Баланс:</span>
                      <span className="text-white font-bold">{balance.toFixed(2)}</span>
                      <GramIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="relative w-full text-center flex items-center justify-center mb-4 mt-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={betInput}
                        onChange={handleBetChange}
                        className="bg-transparent text-center text-5xl font-display font-bold text-white outline-none w-full max-w-[200px]"
                        placeholder="0.1"
                      />
                    </div>
                    <div className="flex gap-2">
                      {[1, 5, 25, 50].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setBetAdd(amt)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-[13px] font-bold hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
                        >
                          +{amt}
                        </button>
                      ))}
                      <button
                        onClick={setBetMax}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-brand/70 text-[13px] font-bold hover:bg-brand/10 active:scale-95 transition-colors cursor-pointer"
                      >
                        MAX
                      </button>
                    </div>

                    {/* Auto-Cashout Settings */}
                    <div className="flex items-center gap-3 w-full mt-4 bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <div 
                        className="flex items-center gap-2 cursor-pointer select-none"
                        onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
                      >
                        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${autoCashoutEnabled ? 'bg-brand' : 'bg-white/20'}`}>
                          <div className={`w-4 h-4 bg-black/80 rounded-full transition-transform duration-300 ease-out shadow-sm ${autoCashoutEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-white/80 text-[13px] font-bold">Автовывод</span>
                      </div>
                      <div className={`flex-1 flex items-center justify-end transition-opacity ${autoCashoutEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <span className="text-white/40 text-[12px] font-medium mr-2">множитель</span>
                        <div className="bg-black/30 rounded-lg px-2.5 py-1 flex items-center border border-white/5">
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={autoCashoutInput}
                            onChange={(e) => setAutoCashoutInput(e.target.value.replace(/,/g, '.'))}
                            className="bg-transparent text-right text-[14px] font-bold text-white outline-none w-12"
                            placeholder="2.00"
                          />
                          <span className="text-white/50 text-[12px] font-bold ml-1">x</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex gap-3 overflow-x-auto scrollbar-hide py-2 px-2">
                    {inventory.length === 0 ? (
                      <div className="text-white/40 text-sm italic w-full text-center">Инвентарь пуст</div>
                    ) : (
                      inventory.map(item => (
                        <button
                          key={item.uniqueId}
                          onClick={() => setSelectedNft(item)}
                          className={`shrink-0 w-24 h-[132px] rounded-2xl border flex flex-col items-center p-2 transition-all cursor-pointer ${
                            selectedNft?.uniqueId === item.uniqueId
                              ? 'bg-brand/20 border-brand scale-105'
                              : 'bg-black/20 border-white/5 opacity-50 hover:opacity-100'
                          }`}
                        >
                          <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-2">
                            <PremiumImage
                              src={item.image_url}
                              alt=""
                              className="w-12 h-12 object-contain drop-shadow-md"
                              staticMode={true}
                            />
                          </div>
                          <div className="flex flex-col items-center w-full shrink-0">
                            <span className="text-[10px] text-white/80 font-medium truncate w-[95%] text-center">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-brand font-bold flex items-center justify-center gap-0.5 mt-0.5">
                              {item.floor_price_gram || item.price || 0} <GramIcon className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </button>
                      ))
                    )}
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
                  (mode === 'nft' && !selectedNft)
                }
                className="w-full bg-brand text-black font-display font-bold text-[18px] py-4 rounded-[20px] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,184,0,0.2)] cursor-pointer"
              >
                {isSubmittingBet ? 'Размещение...' : 'Сделать ставку'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Celebration Modal when user cashes out */}
      <AnimatePresence>
        {wonResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setWonResult(null)}
            />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#24242e] to-[#17171d] border border-brand/40 rounded-[32px] p-6 flex flex-col items-center text-center shadow-[0_0_50px_rgba(255,184,0,0.3)] z-10"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mb-4" />

              {wonResult.gift ? (
                <>
                  <div className="w-24 h-24 rounded-2xl bg-black/50 border border-brand/40 flex items-center justify-center p-2 mb-3.5 shadow-[0_0_30px_rgba(255,184,0,0.25)]">
                    <PremiumImage
                      staticMode={true}
                      src={wonResult.gift.image_url}
                      alt={wonResult.gift.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[11px] uppercase tracking-widest font-extrabold text-brand bg-brand/15 px-3 py-1 rounded-full mb-1">
                    NFT Выигрыш! (x{wonResult.multiplier.toFixed(2)})
                  </span>
                  <h3 className="font-display text-2xl font-black text-white mt-1 mb-2">
                    {wonResult.gift.name}
                  </h3>
                  <div className="flex flex-col gap-2 w-full bg-white/5 rounded-2xl p-3 mb-5 border border-white/5 text-sm">
                    <div className="flex justify-between items-center text-white/70">
                      <span>Стоимость NFT:</span>
                      <span className="font-bold text-white flex items-center gap-1">
                        {wonResult.gift.price || wonResult.gift.floor_price_gram} <GramIcon className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    {wonResult.remainder && wonResult.remainder > 0 ? (
                      <div className="flex justify-between items-center text-emerald-400 font-semibold">
                        <span>Остаток на баланс:</span>
                        <span className="flex items-center gap-1 font-bold">
                          +{wonResult.remainder.toFixed(2)} <GramIcon className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    ) : null}
                    <div className="flex justify-between items-center text-brand font-bold pt-1.5 border-t border-white/10">
                      <span>Итоговый приз:</span>
                      <span className="flex items-center gap-1">
                        {wonResult.winAmount.toFixed(2)} <GramIcon className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-brand/10 border-2 border-brand/40 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,184,0,0.25)]">
                    <GramIcon className="w-10 h-10 text-brand" />
                  </div>
                  <span className="text-[11px] uppercase tracking-widest font-extrabold text-brand bg-brand/15 px-3 py-1 rounded-full mb-1">
                    Успешный вывод! (x{wonResult.multiplier.toFixed(2)})
                  </span>
                  <h3 className="font-display text-3xl font-black text-white mt-1 mb-2 flex items-center justify-center gap-2">
                    +{wonResult.winAmount.toFixed(2)} <GramIcon className="w-6 h-6 text-brand" />
                  </h3>
                  <p className="text-white/60 text-xs mb-5">
                    Выигрыш зачислен на ваш игровой баланс
                  </p>
                </>
              )}

              <button
                onClick={() => setWonResult(null)}
                className="w-full py-3.5 bg-brand text-black font-display font-bold text-base rounded-2xl active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(255,184,0,0.2)] cursor-pointer"
              >
                Отлично!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
