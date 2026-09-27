import { useTranslation } from '../lib/i18n';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { incrementStat, recordGameProgress } from '../lib/stats';
import { ArrowLeft, Zap, Trophy, Bomb, X, TrendingUp, Shuffle, Trash2 } from 'lucide-react';
import { GramIcon } from './GramIcon';
import { PremiumImage } from './PremiumImage';
import { getNftBackdrop } from '../lib/nftUtils';
import { NftSelectorGrid } from './NftSelectorGrid';
import { GameLossModal } from './GameLossModal';
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
      
      const openedCount = safeOpened;
      const curMult = openedCount > 0 ? getMultiplier(minesCount, openedCount) : 1;
      const betVal = activeBetValue;
      const lostNft = currentBetNftRef.current;
      currentBetNftRef.current = null;
      setSelectedNft(null);
      localStorage.removeItem('mines_selectedNftModel');

      setTimeout(() => {
        setShowResult({ 
          type: 'loss',
          amount: betVal,
          item: mode === 'nft' ? lostNft : undefined,
          safeOpened: openedCount,
          minesCount,
          mult: curMult
        });
      }, 700);
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
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-colors hover:bg-white/20 border border-white/5 z-20"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
      <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-center pointer-events-none z-10">
        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">{t('mines_title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pt-[72px]">
        <div className="px-4 py-6 flex flex-col items-center">
          
          <div className="w-full max-w-[400px] aspect-square grid grid-cols-5 gap-2 mb-6">
            <AnimatePresence mode="popLayout">
              {grid.map((cell, idx) => (
                <button
                  key={idx}
                  disabled={gameState !== 'playing' || cell.revealed}
                  onClick={() => handleCellClick(idx)}
                  className={`
                    relative rounded-2xl flex items-center justify-center overflow-hidden w-full aspect-square group
                    ${cell.revealed 
                      ? cell.isMine 
                        ? 'bg-danger/20 border-2 border-danger shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                        : 'bg-brand/10 border border-brand/50 shadow-[0_0_15px_rgba(255,184,0,0.1)]'
                      : 'bg-[#222228] hover:bg-[#2a2a32] active:scale-95 transition-colors shadow-inner'
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
                    <motion.div
                      initial={cell.manualReveal ? { scale: 0, rotate: -45 } : false}
                      animate={cell.manualReveal ? { scale: 1, rotate: 0 } : false}
                      transition={{ type: 'spring', damping: 14, stiffness: 280 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      {cell.isMine ? (
                        <img
                          src="/bomb-planted.png"
                          alt="Bomb Planted"
                          className="w-[68%] h-[68%] object-contain drop-shadow-[0_4px_14px_rgba(239,68,68,0.45)] select-none pointer-events-none"
                          draggable={false}
                        />
                      ) : cell.cellNft ? (
                        <PremiumImage 
                          staticMode={!cell.manualReveal}
                          loop={false}
                          loopWithDelay={false}
                          src={cell.cellNft.lottie_url || cell.cellNft.image_url} 
                          alt={cell.cellNft.name || "NFT Drop"} 
                          className="w-[60%] h-[60%] object-contain drop-shadow-lg select-none pointer-events-none"
                        />
                      ) : (
                        <GramIcon className="w-[60%] h-[60%] text-brand drop-shadow-lg opacity-70" />
                      )}
                    </motion.div>
                  )}
                </button>
              ))}
            </AnimatePresence>
          </div>

          {/* Multiplier Track */}
          <div className="w-full h-[76px] mb-6 relative overflow-hidden pointer-events-none" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="absolute top-0 bottom-0 left-4 w-full flex items-center justify-start">
              <motion.div 
                className="flex items-center gap-2"
                initial={false}
                animate={{ x: -(safeOpened * 96) }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              >
                {fullTrack.map((m) => {
                   const isTarget = m.step === safeOpened + 1;
                   const isSecured = m.step <= safeOpened;
                   
                   return (
                     <div key={m.step} className={`shrink-0 w-[88px] h-[64px] rounded-2xl flex flex-col items-center justify-center border transition-all duration-300 ${
                       isTarget ? 'bg-brand/20 border-brand scale-110 shadow-[0_0_15px_rgba(255,184,0,0.2)]' : 
                       isSecured ? 'bg-success/20 border-success/50' : 'bg-[#1c1c20] border-white/5 opacity-40'
                     }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                           {m.nft ? (
                             <PremiumImage src={m.nft.image_url} alt="" className="w-4 h-4 object-contain drop-shadow-sm" staticMode={true} />
                           ) : (
                             <GramIcon className={`w-3.5 h-3.5 ${isSecured ? 'text-success' : 'text-brand'}`} />
                           )}
                           <span className={`text-[10px] font-bold ${isSecured ? 'text-success' : 'text-white/70'}`}>{t('step')} {m.step}</span>
                        </div>
                        <span className={`font-display font-bold ${isTarget ? 'text-[16px] text-brand' : isSecured ? 'text-[15px] text-success' : 'text-[14px] text-white'}`}>
                          x{m.mult.toFixed(2)}
                        </span>
                     </div>
                   )
                })}
              </motion.div>
            </div>
          </div>

          {gameState === 'idle' ? (
            <button
              onClick={() => setShowBetModal(true)}
              className="w-full relative overflow-hidden group rounded-[20px] font-display font-bold text-[18px] tracking-wide active:scale-[0.98] transition-all py-4 bg-brand text-black shadow-[0_0_30px_rgba(255,184,0,0.3)]"
            >
              Place bet
            </button>
          ) : (
            <button
              onClick={() => handleCashout()}
              disabled={safeOpened === 0}
              className={`w-full relative overflow-hidden group rounded-[20px] font-display font-bold text-[18px] tracking-wide active:scale-[0.98] transition-all py-4 shadow-[0_0_30px_rgba(255,184,0,0.3)]
                ${safeOpened > 0 ? 'bg-brand text-black' : 'bg-white/5 text-white/30 shadow-none'}
              `}
            >
              Withdraw {currentEligibleNft ? currentEligibleNft.name : `${currentWinAmount.toFixed(2)} GRAM`}
            </button>
          )}

          <div className="w-full mt-8 flex flex-col gap-3 pb-8">
            <AnimatePresence mode="popLayout">
              {realOpens.filter(o => o.game === 'mines').slice(0, 5).map((open) => {
                const isNftWin = !open.isGram && open.gift;
                const exactMult = open.multiplier || Number((1 + (open.id.charCodeAt(0) % 5) + ((open.id.charCodeAt(1) || 0) % 100) / 100).toFixed(2));
                const multStr = exactMult.toFixed(2);
                
                let winAmount = Number(open.price).toFixed(2);
                if (isNftWin && open.gift) {
                  winAmount = Number(open.gift.price || open.price).toFixed(2);
                }
                const betAmount = (open.price / exactMult).toFixed(2);
                
                return (
                <motion.div 
                  key={open.id} 
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex items-center justify-between bg-[#1c1c20] rounded-[24px] p-3 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${open.firstName || undefined}`} alt="" className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-white font-medium text-[15px] truncate max-w-[100px]">{open.firstName}</span>
                      <div className="flex items-center gap-1.5 opacity-60">
                        {isNftWin ? (
                           <span className="text-[12px] font-medium">{t('bet_nft')}</span>
                        ) : (
                           <>
                             <GramIcon className="w-3.5 h-3.5" />
                             <span className="text-[12px] font-medium">{betAmount}</span>
                           </>
                        )}
                        <span className="text-[12px]">x{multStr}</span>
                      </div>
                    </div>
                  </div>
                  {isNftWin && open.gift ? (
                     <div className="flex items-center gap-3 bg-black/20 rounded-[16px] pr-4 p-1.5">
                       <PremiumImage staticMode={true} src={open.gift.image_url} alt={open.gift.name} className="w-10 h-10 object-contain drop-shadow-md" />
                       <div className="flex flex-col items-end justify-center">
                         <span className="text-brand font-bold text-[14px] leading-none mb-1 flex items-center gap-1">
                           {winAmount} <GramIcon className="w-3 h-3" />
                         </span>
                         <span className="text-[10px] text-white/50 leading-none truncate max-w-[80px] text-right">{open.gift.name}</span>
                       </div>
                     </div>
                  ) : (
                     <div className="flex items-center gap-1.5 text-success font-display text-[16px] font-bold">
                       +{winAmount} <GramIcon className="w-4 h-4 text-success" />
                     </div>
                  )}
                </motion.div>
                );
              })}
            </AnimatePresence>
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
              className="fixed bottom-0 left-0 right-0 z-[110] bg-[#1a1a20] rounded-t-[32px] p-5 pb-8 flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.6)] border-t border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-8" />
                <h2 className="text-[20px] font-display font-bold text-white text-center">{t('make_bet_title')}</h2>
                <button 
                  onClick={() => setShowBetModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex p-1 bg-black/20 rounded-2xl mb-6">
                <button 
                  onClick={() => setMode('nft')}
                  className={`flex-1 py-2.5 rounded-[12px] font-medium text-[15px] transition-all
                    ${mode === 'nft' ? 'bg-brand text-black shadow-sm' : 'text-white/40 hover:text-white/80'}
                  `}
                >
                  Gifts
                </button>
                <button 
                  onClick={() => setMode('gram')}
                  className={`flex-1 py-2.5 rounded-[12px] font-medium text-[15px] transition-all
                    ${mode === 'gram' ? 'bg-brand text-black shadow-sm' : 'text-white/40 hover:text-white/80'}
                  `}
                >
                  GRAM
                </button>
              </div>

              <div className="bg-[#222228] rounded-[24px] p-6 mb-4 flex flex-col items-center justify-center min-h-[120px] border border-white/5 relative">
                {mode === 'gram' ? (
                  <>
                    <div className="absolute top-4 left-5 flex items-center gap-1 text-white/50 text-[12px] font-medium">
                      <span>{t('balance')}:</span>
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
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-[13px] font-bold hover:bg-white/10 active:scale-95 transition-colors"
                        >
                          +{amt}
                        </button>
                      ))}
                      <button 
                        onClick={setBetMax}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-brand/70 text-[13px] font-bold hover:bg-brand/10 active:scale-95 transition-colors"
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

              <div className="bg-[#222228] rounded-[24px] p-5 mb-6 border border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-danger/20 to-transparent" />
                    <Bomb className="w-7 h-7 text-danger relative z-10" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-[16px]">{t('choose_mines')}</span>
                    <span className="text-white/40 text-[13px]">{t('more_mines')}</span>
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
                className="w-full bg-brand text-black font-display font-bold text-[18px] py-4 rounded-[20px] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,184,0,0.2)] cursor-pointer"
              >
                Place bet
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
                      src={showResult.item.image_url || `/nft/${showResult.item.name}.png`} 
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
                    className="w-full py-3 rounded-[10px] text-[12px] font-bold flex items-center justify-center gap-1.5 bg-brand text-black hover:bg-brand/90 transition-colors shadow-[0_0_15px_rgba(249,194,60,0.3)]"
                  >
                    Continue
                  </button>
                ) : (
                  <>
                    <div className="flex gap-1.5 w-full">
                      <button 
                        onClick={() => { resetGame(); if(onNavigate) onNavigate('upgrade'); }}
                        className="flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#22c55e] text-white hover:bg-[#16a34a] transition-colors"
                      >
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t('upgrade')}</span>
                      </button>
                      <button 
                        onClick={() => { resetGame(); if(onNavigate) onNavigate('craft'); }}
                        className="flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-colors"
                      >
                        <Shuffle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t('craft')}</span>
                      </button>
                      <button 
                        onClick={() => { resetGame(); if(onNavigate) onNavigate('mines'); }}
                        className="flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#a855f7] text-white hover:bg-[#9333ea] transition-colors"
                      >
                        <Bomb className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Mines</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => { resetGame(); if(onNavigate) onNavigate('inventory'); }}
                      className="w-full py-3 rounded-[10px] text-[12px] font-bold flex items-center justify-center gap-1.5 bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors"
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
                      className="w-full py-3 flex items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-bold bg-[#2a2c33] text-white/90 hover:bg-white/10 transition-colors"
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

      {/* Beautiful Defeat Modal */}
      <GameLossModal
        isOpen={Boolean(showResult && showResult.type === 'loss')}
        onClose={resetGame}
        onRetry={() => {
          resetGame();
          setShowBetModal(true);
        }}
        game="mines"
        onNavigate={onNavigate}
      />
    </div>
  );
}

