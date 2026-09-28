import { useTranslation } from '../lib/i18n';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { incrementStat, recordGameProgress } from '../lib/stats';
import { ArrowLeft, Zap, Trophy, Bomb, X, TrendingUp, Shuffle, Trash2 } from 'lucide-react';
import { GramIcon } from './GramIcon';
import { PremiumImage } from './PremiumImage';
import { CleanModelLottie } from './CleanModelLottie';
import { BombNft } from './BombNft';
import { getNftBackdrop } from '../lib/nftUtils';
import { NftSelectorGrid } from './NftSelectorGrid';
import { RangeControl } from './ui/RangeControl';

function getMultiplier(mines: number, opened: number): number {
  if (opened === 0) return 1;
  let probability = 1;
  let remainingSafe = 25 - mines;
  let remainingTotal = 25;
  for (let i = 0; i < opened; i++) {

    if (remainingSafe <= 0) return 0;
    probability *= (remainingSafe / remainingTotal);
    remainingSafe--;
    remainingTotal--;
  }
  const houseEdge = 0.95; // 95% RTP
  return probability > 0 ? (1 / probability) * houseEdge : 0;
}


const getInitialMinesSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem('mines_session');
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed && parsed.gameState === 'playing') {
        return parsed;
      }
    }
  } catch {}
  return null;
};

export function Mines({ 
  onBack, 
  inventory, 
  setInventory, 
  balance, 
  setBalance, 
  onTurnover, 
  onWin, 
  giftsDb,
  onNavigate
}: { 
  onBack: () => void,
  inventory: any[],
  setInventory: (inv: any[]) => void,
  balance: number,
  setBalance: (b: number | ((prev: number) => number)) => void,
  onTurnover: (amt: number) => void,
  onWin: (amt: number, mode: 'gram' | 'nft', item?: any, mult?: number) => void,
  giftsDb: any[],
  onNavigate?: (target: string) => void
}) {
  const { t } = useTranslation();
  const [realOpens, setRealOpens] = useState<any[]>([]);

  const plushPepeItem = giftsDb.find(g => g.name === 'Plush Pepe' || g.slug === 'plushpepe');
  const MAX_WIN_GRAM = plushPepeItem ? plushPepeItem.floor_price_gram : 5000;
  const MAX_BET_GRAM = 2500;

  useEffect(() => {
    const fetchOpens = () => {
      fetch('/api/opens/recent?limit=20')
        .then((res) => res.json())
        .then((data) => setRealOpens(data))
        .catch(() => {});
    };
    fetchOpens();
    const interval = setInterval(fetchOpens, 3000);
    return () => clearInterval(interval);
  }, []);

  const [mode, setMode] = useState<'gram' | 'nft'>(() => {
    try {
      return (localStorage.getItem('mines_mode') as 'gram' | 'nft') || 'gram';
    } catch {
      return 'gram';
    }
  });
  const [betInput, setBetInput] = useState<string>(() => {
    try {
      return localStorage.getItem('mines_bet') || '';
    } catch {
      return '';
    }
  });
  const betGram = parseFloat(betInput) || 0;
  const [selectedNft, setSelectedNft] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('mines_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('mines_bet', betInput);
  }, [betInput]);

    const isInitRef = useRef(false);
  const currentBetNftRef = useRef<any>(null);

  useEffect(() => {
    if (!isInitRef.current) return;
    if (selectedNft) {
      localStorage.setItem('mines_selectedNftModel', selectedNft.id);
    } else {
      localStorage.removeItem('mines_selectedNftModel');
    }
  }, [selectedNft]);

  useEffect(() => {
    if (!isInitRef.current) {
      isInitRef.current = true;
      try {
        const savedModel = localStorage.getItem('mines_selectedNftModel');
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
  
    const initialSession = useMemo(() => getInitialMinesSession(), []);
  
  const [minesCount, setMinesCount] = useState<number>(initialSession?.minesCount || 1);
  const [gameState, setGameState] = useState<'idle' | 'playing'>(initialSession?.gameState || 'idle');
  const [activeBetValue, setActiveBetValue] = useState<number>(initialSession?.activeBetValue || 0);
  const [grid, setGrid] = useState<{isMine: boolean, revealed: boolean, manualReveal?: boolean, cellNft?: any}[]>(initialSession?.grid || Array(25).fill({ isMine: false, revealed: false }));
  const [safeOpened, setSafeOpened] = useState<number>(initialSession?.safeOpened || 0);

  useEffect(() => {
    if (gameState === 'playing') {
      localStorage.setItem('mines_session', JSON.stringify({
        gameState,
        activeBetValue,
        grid,
        safeOpened,
        minesCount
      }));
    } else {
      localStorage.removeItem('mines_session');
    }
  }, [gameState, activeBetValue, grid, safeOpened, minesCount]);

  
  const [showResult, setShowResult] = useState<{
    type: 'win' | 'loss';
    amount?: number;
    item?: any;
    safeOpened?: number;
    minesCount?: number;
    mult?: number;
  } | null>(null);
  const [showBetModal, setShowBetModal] = useState(false);

  const calculateMultiplier = (opened: number = safeOpened) => {
    if (opened === 0) return 1;
    let mult = getMultiplier(minesCount, opened);
    if (activeBetValue > 0 && activeBetValue * mult > MAX_WIN_GRAM) {
       mult = MAX_WIN_GRAM / activeBetValue;
    }
    return mult;
  };

  // Only classic NFTs without Black or Onyx Black backgrounds can be won in Mines
  const classicGiftsDb = useMemo(() => {
    return (giftsDb || []).filter(g => getNftBackdrop(g) === 'Default');
  }, [giftsDb]);

  useEffect(() => {
    // Preload NFT drop images so they appear instantaneously with 0 delay and no placeholder
    classicGiftsDb.slice(0, 25).forEach(g => {
      if (g.image_url) {
        const img = new Image();
        img.src = g.image_url;
      }
    });
  }, [classicGiftsDb]);

  const multiplier = calculateMultiplier();
  let currentWinAmount = activeBetValue * multiplier;
  if (currentWinAmount > MAX_WIN_GRAM) currentWinAmount = MAX_WIN_GRAM;

  const currentEligibleNft = classicGiftsDb.filter(g => g.floor_price_gram <= currentWinAmount).sort((a,b) => b.floor_price_gram - a.floor_price_gram)[0];

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
    setBetInput((prev) => {
      let next = parseFloat(prev || '0') + amt;
      if (next > MAX_BET_GRAM) next = MAX_BET_GRAM;
      return next.toString();
    });
  };

  const setBetMax = () => {
    let max = balance;
    if (max > MAX_BET_GRAM) max = MAX_BET_GRAM;
    setBetInput(max.toString());
  };

  const startGame = () => {
    let betValue = 0;
    if (mode === 'gram') {
      if (betGram < 0.1 || betGram > balance || betGram > MAX_BET_GRAM) return;
      setBalance(b => b - betGram);
      onTurnover(betGram);
      betValue = betGram;
    } else {
      if (!selectedNft) return;
      const nftPrice = Number(selectedNft.floor_price_gram || selectedNft.price || 0);
      if (nftPrice > MAX_BET_GRAM) return;
      currentBetNftRef.current = selectedNft;
      setInventory(inventory.filter(i => i.uniqueId !== selectedNft.uniqueId));
      onTurnover(nftPrice);
      betValue = nftPrice;
      setSelectedNft(null);
      localStorage.removeItem('mines_selectedNftModel');
    }
    
    setActiveBetValue(betValue);
    
    const newGrid = Array(25).fill({ isMine: false, revealed: false });
    let minesPlaced = 0;
    while(minesPlaced < minesCount) {
      const idx = Math.floor(Math.random() * 25);
      if (!newGrid[idx].isMine) {
        newGrid[idx] = { isMine: true, revealed: false };
        minesPlaced++;
      }
    }
    
    setGrid(newGrid);
    setGameState('playing');
    setSafeOpened(0);
    setShowBetModal(false);
  };

  const resetGame = () => {
    setGameState('idle');
    setSafeOpened(0);
    currentBetNftRef.current = null;
    setSelectedNft(null);
    localStorage.removeItem('mines_selectedNftModel');
    setActiveBetValue(mode === 'gram' ? betGram : 0);
    setGrid(Array(25).fill({ isMine: false, revealed: false }));
    setShowResult(null);
  };

  useEffect(() => {
    if (gameState === 'idle') {
      setActiveBetValue(mode === 'gram' ? betGram : (selectedNft?.floor_price_gram || 0));
    }
  }, [mode, betGram, selectedNft, gameState]);

  const handleCashout = (forcedMult?: number) => {
    if (gameState !== 'playing' || safeOpened === 0) return;
    
    currentBetNftRef.current = null;
    setSelectedNft(null);
    localStorage.removeItem('mines_selectedNftModel');

    const finalMult = forcedMult || multiplier;
    let winAmount = activeBetValue * finalMult;
    if (winAmount > MAX_WIN_GRAM) winAmount = MAX_WIN_GRAM;

    const bestNft = classicGiftsDb.filter(g => g.floor_price_gram <= winAmount).sort((a,b) => b.floor_price_gram - a.floor_price_gram)[0];

    if (bestNft) {
      const uniqueItem = { 
        ...bestNft, 
        uniqueId: Math.random().toString(36).substr(2, 9),
        price: Number(bestNft.floor_price_gram || bestNft.price || 0)
      };
      setInventory([...inventory, uniqueItem]);
      const remainder = winAmount - bestNft.floor_price_gram;
      if (remainder > 0) {
        setBalance(b => b + remainder);
      }
      onWin(winAmount, 'nft', uniqueItem, finalMult);
      setShowResult({ type: 'win', item: uniqueItem, amount: remainder > 0 ? remainder : undefined });
      incrementStat('stat_mines_wins');
      recordGameProgress('mines', activeBetValue, finalMult, 1);
    } else {
      setBalance(b => b + winAmount);
      onWin(winAmount, 'gram', undefined, finalMult);
      setShowResult({ type: 'win', amount: winAmount });
      incrementStat('stat_mines_wins');
      recordGameProgress('mines', activeBetValue, finalMult, 1);
    }
    
    setGameState('idle');
  };

  const handleCellClick = (index: number) => {
    if (gameState !== 'playing' || grid[index].revealed) return;

    const isMine = grid[index].isMine;
    
    if (isMine) {
      setGrid(prev => prev.map(cell => ({ ...cell, revealed: true, manualReveal: false })));
      setGameState('idle');
      
      const lostNft = currentBetNftRef.current;
      currentBetNftRef.current = null;
      setSelectedNft(null);
      localStorage.removeItem('mines_selectedNftModel');
    } else {
      const newOpened = safeOpened + 1;
      let currentMult = getMultiplier(minesCount, newOpened);
      let isMaxWinHit = false;

      if (activeBetValue > 0 && activeBetValue * currentMult >= MAX_WIN_GRAM) {
        currentMult = MAX_WIN_GRAM / activeBetValue;
        isMaxWinHit = true;
      }
      
      const prevMult = safeOpened === 0 ? 1 : getMultiplier(minesCount, safeOpened);
      let prevWin = activeBetValue * prevMult;
      let newWin = activeBetValue * currentMult;
      if (prevWin > MAX_WIN_GRAM) prevWin = MAX_WIN_GRAM;
      
      const prevMaxNft = classicGiftsDb.filter(g => g.floor_price_gram <= prevWin).sort((a,b) => b.floor_price_gram - a.floor_price_gram)[0];
      const newMaxNft = classicGiftsDb.filter(g => g.floor_price_gram <= newWin).sort((a,b) => b.floor_price_gram - a.floor_price_gram)[0];

      let cellNft = undefined;
      if (newMaxNft && (!prevMaxNft || newMaxNft.id !== prevMaxNft.id)) {
        cellNft = newMaxNft;
      }

      setSafeOpened(newOpened);
      setGrid(prev => {
        const newGrid = [...prev];
        newGrid[index] = { ...newGrid[index], revealed: true, manualReveal: true, cellNft };
        return newGrid;
      });
      
      
      if (newOpened === 25 - minesCount || isMaxWinHit) {
        setTimeout(() => handleCashout(currentMult), 500);
      }
    }
  };

  const fullTrack = useMemo(() => {
    const steps = [];
    const maxPossibleSteps = 25 - minesCount;
    
    for (let i = 1; i <= maxPossibleSteps; i++) {
       let stepMult = getMultiplier(minesCount, i);
       let winAmount = activeBetValue * stepMult;
       let isMaxHit = false;
       
       if (activeBetValue > 0 && winAmount >= MAX_WIN_GRAM) {
          stepMult = MAX_WIN_GRAM / activeBetValue;
          winAmount = MAX_WIN_GRAM;
          isMaxHit = true;
       }
       
       const stepNft = classicGiftsDb.filter(g => g.floor_price_gram <= winAmount).sort((a,b) => b.floor_price_gram - a.floor_price_gram)[0];
       
       steps.push({ step: i, mult: stepMult, winAmount, nft: stepNft });
       
       if (isMaxHit) break;
    }
    return steps;
  }, [minesCount, activeBetValue, classicGiftsDb]);

  return (
    <div className="h-full w-full flex flex-col bg-canvas text-white relative">
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/[0.12] hover:bg-white/[0.20] border border-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer z-20"
      >
        <ArrowLeft className="w-4 h-4 text-white" />
      </button>
      <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-center pointer-events-none z-10">
        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">{t('mines_title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pt-[72px]">
        <div className="px-4 py-6 flex flex-col items-center">
          
          <div className="w-full max-w-[400px] aspect-square grid grid-cols-5 gap-2 mb-6">
            {grid.map((cell, idx) => (
              <button
                key={idx}
                disabled={gameState !== 'playing' || cell.revealed}
                onClick={() => handleCellClick(idx)}
                className={`
                  mine-cell relative rounded-2xl flex items-center justify-center overflow-hidden w-full aspect-square group
                  ${cell.revealed 
                    ? cell.isMine 
                      ? 'bg-danger/20 border-2 border-danger' 
                      : 'bg-brand/10 border border-brand/50'
                    : 'bg-white/[0.09] hover:bg-white/[0.16] active:scale-95 border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_12px_rgba(0,0,0,0.25)] transition-colors'
                  }
                `}
              >
                <div className="absolute inset-0 border-t border-white/10 rounded-2xl pointer-events-none" />
                
                {/* Transparent Colorless Heroic Helmet in the middle of closed cells */}
                {!cell.revealed && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <img
                      src="/heroic-helmet.webp"
                      alt=""
                      style={{ filter: 'grayscale(100%) brightness(1.75)' }}
                      className="w-[34%] h-[34%] object-contain opacity-15 group-hover:opacity-25 transition-opacity duration-200 select-none pointer-events-none"
                      draggable={false}
                    />
                  </div>
                )}

                {cell.revealed && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {cell.isMine ? (
                      <div className={cell.manualReveal ? 'win-drop-in' : ''} style={{ width: '84%', height: '84%' }}>
                        <BombNft className="w-full h-full" animated={true} />
                      </div>
                    ) : cell.manualReveal ? (
                      <>
                        {/* Burst ring effect like a real live drop */}
                        <span className="absolute w-1/2 h-1/2 rounded-full bg-brand/35 win-ring pointer-events-none" />
                        <span className="absolute w-2/3 h-2/3 rounded-full bg-amber-300/25 win-ring pointer-events-none" style={{ animationDelay: '80ms' }} />
                        <div className="win-drop-in w-full h-full flex items-center justify-center">
                          {cell.cellNft ? (
                            <PremiumImage 
                              staticMode={false}
                              loop={false}
                              loopWithDelay={false}
                              src={cell.cellNft.lottie_url || cell.cellNft.image_url} 
                              alt={cell.cellNft.name || "NFT Drop"} 
                              className="w-[65%] h-[65%] object-contain drop-shadow-[0_0_18px_rgba(255,184,0,0.55)] select-none pointer-events-none"
                            />
                          ) : (
                            <div className="relative w-[62%] h-[62%] flex items-center justify-center">
                              {/* Mini Artisan-Brick-style gem drop with glow (safe-cell reward) */}
                              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/40 via-yellow-300/20 to-transparent blur-md" />
                              <GramIcon className="relative w-full h-full text-brand drop-shadow-[0_0_14px_rgba(255,184,0,0.55)]" />
                            </div>
                          )}
                        </div>
                      </>
                    ) : cell.cellNft ? (
                      <PremiumImage 
                        staticMode={true}
                        loop={false}
                        loopWithDelay={false}
                        src={cell.cellNft.lottie_url || cell.cellNft.image_url} 
                        alt={cell.cellNft.name || "NFT Drop"} 
                        className="w-[60%] h-[60%] object-contain drop-shadow-lg select-none pointer-events-none"
                      />
                    ) : (
                      <GramIcon className="w-[60%] h-[60%] text-brand drop-shadow-lg opacity-70" />
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Multiplier Track — optimized with CSS transform (no heavy spring per tick) */}
          <div className="w-full h-[76px] mb-6 relative overflow-hidden pointer-events-none gpu-layer" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="absolute top-0 bottom-0 left-4 w-full flex items-center justify-start">
              <div 
                className="flex items-center gap-2 will-change-transform"
                style={{
                  transform: `translateX(${-(safeOpened * 96)}px) translateZ(0)`,
                  transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                {fullTrack.map((m) => {
                   const isTarget = m.step === safeOpened + 1;
                   const isSecured = m.step <= safeOpened;
                   
                   return (
                     <div key={m.step} className={`shrink-0 w-[88px] h-[64px] rounded-2xl flex flex-col items-center justify-center border ${
                       isTarget ? 'bg-brand/20 border-brand scale-110' : 
                       isSecured ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-[#1c1c20] border-white/5 opacity-40'
                     }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                           <GramIcon className={`w-3.5 h-3.5 ${isSecured ? 'text-emerald-400' : isTarget ? 'text-brand' : 'text-white/50'}`} />
                           <span className={`text-[10px] font-bold ${isSecured ? 'text-emerald-400' : isTarget ? 'text-brand' : 'text-white/60'}`}>{m.step}</span>
                        </div>
                        <span className={`font-display font-bold ${isTarget ? 'text-[16px] text-brand' : isSecured ? 'text-[15px] text-emerald-400' : 'text-[14px] text-white/80'}`}>
                          x{m.mult.toFixed(2)}
                        </span>
                     </div>
                   )
                })}
              </div>
            </div>
          </div>

          {gameState === 'idle' ? (
            <button
              onClick={() => setShowBetModal(true)}
              className="w-full relative overflow-hidden group rounded-full font-display font-bold text-[17px] tracking-wide active:scale-[0.98] transition-all py-4 shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white cursor-pointer"
            >
              <span className="relative z-10 drop-shadow-sm">{t('mines_make_bet') || t('make_bet_btn') || 'Сделать ставку'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleCashout()}
              disabled={safeOpened === 0}
              className={`w-full relative overflow-hidden group rounded-full font-display font-bold text-[17px] tracking-wide active:scale-[0.98] transition-all py-4 cursor-pointer
                ${safeOpened > 0 
                  ? 'bg-gradient-to-r from-[#10b981] via-[#059669] to-[#10b981] text-white shadow-[0_4px_24px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110' 
                  : 'bg-white/[0.06] border border-white/[0.08] text-white/30 shadow-none cursor-not-allowed'}
              `}
            >
              <span className="relative z-10 drop-shadow-sm">
                {safeOpened > 0 
                  ? `${t('take') || 'Забрать'} ${currentEligibleNft ? currentEligibleNft.name : `${currentWinAmount.toFixed(2)} GRAM`}`
                  : (t('mines_open_cell') || 'Откройте ячейку')
                }
              </span>
            </button>
          )}

          <div className="w-full mt-8 flex flex-col gap-2 pb-8">
            {realOpens.filter(o => o.game === 'mines').slice(0, 4).map((open) => {
                const isNftWin = !open.isGram && open.gift;
                const exactMult = open.multiplier || Number((1 + (open.id.charCodeAt(0) % 5) + ((open.id.charCodeAt(1) || 0) % 100) / 100).toFixed(2));
                const multStr = exactMult.toFixed(2);
                
                let winAmount = Number(open.price).toFixed(2);
                if (isNftWin && open.gift) {
                  winAmount = Number(open.gift.price || open.price).toFixed(2);
                }
                const betAmount = (open.price / exactMult).toFixed(2);
                
                return (
                <div 
                  key={open.id}
                  className="flex items-center justify-between bg-white/[0.05] rounded-[20px] p-2.5 border border-white/[0.06] gpu-layer animate-card-in"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/10 to-white/5 shrink-0 flex items-center justify-center text-white/80 font-bold text-[12px]">
                      {(open.firstName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-white font-medium text-[14px] truncate max-w-[90px]">{open.firstName}</span>
                      <div className="flex items-center gap-1.5 opacity-60">
                        {isNftWin ? (
                           <span className="text-[11px] font-medium">NFT</span>
                        ) : (
                           <>
                             <GramIcon className="w-3 h-3" />
                             <span className="text-[11px] font-medium">{betAmount}</span>
                           </>
                        )}
                        <span className="text-[11px]">x{multStr}</span>
                      </div>
                    </div>
                  </div>
                  {isNftWin && open.gift ? (
                     <div className="flex items-center gap-2 min-w-0">
                       <img 
                         src={open.gift.image_url} 
                         alt={open.gift.name} 
                         className="w-8 h-8 object-contain shrink-0"
                         loading="lazy"
                         draggable={false}
                       />
                       <div className="flex flex-col items-end min-w-0">
                         <span className="text-brand font-bold text-[13px] leading-none flex items-center gap-1">
                           {winAmount} <GramIcon className="w-3 h-3" />
                         </span>
                       </div>
                     </div>
                  ) : (
                     <div className="flex items-center gap-1 text-emerald-400 font-display text-[15px] font-bold">
                       +{winAmount} <GramIcon className="w-3.5 h-3.5 text-emerald-400" />
                     </div>
                  )}
                </div>
                );
              })}
          </div>

        </div>
      </div>

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
              className="group fixed bottom-0 left-0 right-0 z-[110] bg-[#16171b]/95 backdrop-blur-2xl rounded-t-[32px] p-5 pb-8 flex flex-col shadow-2xl border-t border-white/[0.12] max-w-md mx-auto overflow-hidden"
            >
              {/* верхний блик жидкого стекла */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-t-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
              />

              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="w-8" />
                <h2 className="text-[17px] font-display font-bold text-white text-center">{t('make_bet_title')}</h2>
                <button 
                  onClick={() => setShowBetModal(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Toggle: Gifts / GRAM in Liquid Glass */}
              <div className="relative z-10 flex p-1 bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] rounded-full mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <button 
                  onClick={() => setMode('nft')}
                  className={`flex-1 py-2 rounded-full font-bold text-[13px] transition-all cursor-pointer ${
                    mode === 'nft' ? 'bg-white/[0.24] text-white border border-white/[0.30] shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.25)]' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {t('gifts') || 'Gifts'}
                </button>
                <button 
                  onClick={() => setMode('gram')}
                  className={`flex-1 py-2 rounded-full font-bold text-[13px] transition-all cursor-pointer ${
                    mode === 'gram' ? 'bg-white/[0.24] text-white border border-white/[0.30] shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.25)]' : 'text-white/70 hover:text-white'
                  }`}
                >
                  GRAM
                </button>
              </div>

              <div className="relative z-10 bg-white/[0.04] border border-white/[0.08] rounded-[24px] p-5 mb-4 flex flex-col items-center justify-center min-h-[120px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                {mode === 'gram' ? (
                  <>
                    <div className="absolute top-3.5 left-4 flex items-center gap-1.5 text-white/50 text-[12px] font-medium">
                      <span>{t('balance')}:</span>
                      <span className="text-white font-bold">{balance.toFixed(2)}</span>
                      <GramIcon className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <div className="relative w-full text-center flex items-center justify-center mb-4 mt-2">
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={betInput}
                        onChange={handleBetChange}
                        className="bg-transparent text-center text-4xl font-display font-bold text-white outline-none w-full max-w-[200px]"
                        placeholder="0.1"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 5, 25, 50].map(amt => (
                        <button 
                          key={amt}
                          onClick={() => setBetAdd(amt)}
                          className="px-3 py-1.5 rounded-full bg-white/[0.14] hover:bg-white/[0.22] border border-white/[0.18] text-white text-[12px] font-bold active:scale-95 transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                        >
                          +{amt}
                        </button>
                      ))}
                      <button 
                        onClick={setBetMax}
                        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0098ea] to-[#00b4d8] hover:brightness-110 border border-cyan-300/40 text-white text-[12px] font-bold active:scale-95 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,152,234,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]"
                      >
                        MAX
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full">
                    <NftSelectorGrid
                      inventory={inventory}
                      selectedIds={selectedNft ? [selectedNft.uniqueId || selectedNft.id] : []}
                      onSelect={(item) => setSelectedNft(item)}
                      maxBetGram={2500}
                      maxContainerHeight="max-h-[280px]"
                      emptyText={t('inventory_empty_upgrade') || 'Инвентарь пуст'}
                    />
                  </div>
                )}
              </div>

              <div className="relative z-10 bg-white/[0.04] border border-white/[0.08] rounded-[24px] p-5 mb-5 flex flex-col gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-[15px]">{t('choose_mines')}</span>
                    <span className="text-white/40 text-[12px]">{t('more_mines')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Live mini mine preview — shows bombs count as you drag */}
                    <div className="flex -space-x-1.5">
                      {Array.from({ length: Math.min(minesCount, 5) }).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-6 h-6 rounded-full bg-danger/20 border border-danger/40 flex items-center justify-center relative overflow-hidden"
                          style={{ zIndex: 5 - i }}
                        >
                          <img 
                            src="/bomb-planted.png" 
                            alt="" 
                            className="w-[80%] h-[80%] object-contain" 
                            draggable={false}
                          />
                        </div>
                      ))}
                      {minesCount > 5 && (
                        <div className="w-6 h-6 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center text-[10px] font-bold text-danger">
                          +{minesCount - 5}
                        </div>
                      )}
                    </div>
                    <div className="text-white font-display font-bold text-sm px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/10 shadow-inner min-w-[48px] text-center">
                      {minesCount}
                    </div>
                  </div>
                </div>
                
                <RangeControl
                  min={1}
                  max={24}
                  value={minesCount}
                  label={t('choose_mines')}
                  onValueCommit={setMinesCount}
                />
              </div>

              <button
                onClick={startGame}
                disabled={
                  (mode === 'gram' && (betGram < 0.1 || betGram > balance || betGram > MAX_BET_GRAM)) ||
                  (mode === 'nft' && (!selectedNft || Number(selectedNft.floor_price_gram || selectedNft.price || 0) > 2500))
                }
                className="relative z-10 w-full font-display font-bold text-[16px] py-4 rounded-full active:scale-[0.98] transition-all shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="relative z-10 drop-shadow-sm">{t('mines_start') || 'Начать игру'}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResult && showResult.type === 'win' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm px-6"
            onClick={resetGame} 
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[280px] flex flex-col gap-2.5 mx-auto p-2 rounded-[28px] relative z-10 transition-all duration-300 shadow-2xl border border-[#3b82f6]/20 bg-[#16181d] shadow-[0_4px_20px_-10px_rgba(59,130,246,0.1)]"
            >
              <div className="w-full flex justify-center pt-1 relative">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-bold text-[#3b82f6] uppercase tracking-widest">Random</span>
                  <span className="text-[8px] text-white/20 font-bold tracking-widest uppercase mt-0.5">Platina Gift</span>
                </div>
                <button onClick={resetGame} className="absolute top-0 right-1 p-1 text-white/40 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="relative overflow-hidden w-full aspect-square rounded-[20px] flex flex-col items-center p-1 transition-all duration-300">
                <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-2">
                  {showResult.item ? (
                    <PremiumImage 
                      staticMode={false} 
                      loopWithDelay={true} 
                      loopDelayMs={5000} 
                      src={showResult.item.lottie_url || showResult.item.image_url || `/nft/${showResult.item.name}.png`} 
                      alt={showResult.item.name} 
                      className="w-[85%] h-[85%] object-contain drop-shadow-lg" 
                    />
                  ) : (
                    <GramIcon className="w-16 h-16 text-success drop-shadow-md" />
                  )}
                </div>
                <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0 pb-1.5 px-1">
                  <span className="text-[12px] text-white/90 w-full text-center font-bold leading-tight line-clamp-2">{showResult.item ? showResult.item.name : t('win')}</span>
                  <span className="text-[13px] font-bold text-white flex items-center justify-center gap-1 mt-0.5">{Number(showResult.amount || 0).toFixed(2)} <GramIcon className="w-3.5 h-3.5" /></span>
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5 w-full mt-1">
                {!showResult.item ? (
                  <button 
                    onClick={resetGame}
                    className="w-full py-3.5 rounded-[16px] text-[14px] font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] cursor-pointer"
                  >
                    {t('continue') || 'Продолжить'}
                  </button>
                ) : (
                  <>
                    <div className="flex gap-1.5 w-full">
                      <button 
                        onClick={() => { resetGame(); if(onNavigate) onNavigate('upgrade'); }}
                        className="flex-1 py-2.5 rounded-[12px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-[0_2px_10px_rgba(34,197,94,0.35)] active:scale-95 transition-all cursor-pointer"
                      >
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t('upgrade')}</span>
                      </button>
                      <button 
                        onClick={() => { resetGame(); if(onNavigate) onNavigate('craft'); }}
                        className="flex-1 py-2.5 rounded-[12px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-[0_2px_10px_rgba(220,38,38,0.35)] active:scale-95 transition-all cursor-pointer"
                      >
                        <Shuffle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t('craft')}</span>
                      </button>
                      <button 
                        onClick={() => { resetGame(); if(onNavigate) onNavigate('mines'); }}
                        className="flex-1 py-2.5 rounded-[12px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#a855f7] text-white hover:bg-[#9333ea] shadow-[0_2px_10px_rgba(168,85,247,0.35)] active:scale-95 transition-all cursor-pointer"
                      >
                        <Bomb className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t('mines_title') || 'Мины'}</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => { resetGame(); if(onNavigate) onNavigate('inventory'); }}
                      className="w-full py-3 rounded-[12px] text-[12px] font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white hover:brightness-110 shadow-[0_4px_16px_rgba(0,152,234,0.4)] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      {t('my_inventory')}
                    </button>
                    <button 
                      onClick={() => {
                        const itemPrice = Number(showResult.item?.price || 0);
                        setBalance((prev: number) => {
                          const newBal = Number((prev + itemPrice).toFixed(2));
                          setInventory(inventory.filter(i => i.uniqueId !== showResult.item?.uniqueId));
                          fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }, body: JSON.stringify({ balance: newBal, inventory: inventory.filter(i => i.uniqueId !== showResult.item?.uniqueId) }) }).catch(()=>{});
                          return newBal;
                        });
                        resetGame();
                      }}
                      className="w-full py-3 flex items-center justify-center gap-1.5 rounded-[12px] text-[12px] font-bold bg-white/[0.12] hover:bg-white/[0.20] border border-white/[0.15] text-white active:scale-[0.98] transition-all cursor-pointer"
                    >
                      {t('sell')} {Number(showResult.item?.price || 0).toFixed(2)} <GramIcon className="w-4 h-4 opacity-80" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

