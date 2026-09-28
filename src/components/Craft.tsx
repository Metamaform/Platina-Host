import { useTranslation } from '../lib/i18n';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, X, Plus, Trash2, AlertTriangle, TrendingUp, Shuffle, Bomb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PremiumImage } from './PremiumImage';
import { incrementStat, recordGameProgress } from '../lib/stats';
import { GramIcon } from './GramIcon';
import { getNftBackdrop } from '../lib/nftUtils';
import { NftSelectorGrid } from './NftSelectorGrid';
import { GameLossModal } from './GameLossModal';
import { LiquidSegment } from './ui/LiquidSegment';

const MULTIPLIERS = [2, 5, 10, 15, 100];
const MAX_BANK = 2500;
const MAX_WIN = 5000;

export function Craft({ inventory, giftsDb, onBack, setInventory, onWin, onTurnover, balance, setBalance, onNavigate }: { inventory: any[], giftsDb: any[], onBack: () => void, setInventory: any, onWin?: (item: any, price: number) => void, onTurnover?: (amount: number) => void, balance: number, setBalance: any, onNavigate?: (target: string) => void }) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{
    status: 'win' | 'lose';
    item?: any;
    refund?: number;
    lostItems?: any[];
    totalValue?: number;
    multiplier?: number;
  } | null>(null);
  const [multiplier, setMultiplier] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('craft_multiplier')) || 2;
    } catch {
      return 2;
    }
  });
  const pendingResultRef = useRef<any>(null);

  const saveModelsToLocal = (uids: string[]) => {
    if (!uids || uids.length === 0) {
      localStorage.removeItem('craft_sourceModelIds');
      return;
    }
    const models = uids.map(uid => inventory.find(i => i.uniqueId === uid)?.id).filter(Boolean);
    if (models.length > 0) {
      localStorage.setItem('craft_sourceModelIds', JSON.stringify(models));
    } else {
      localStorage.removeItem('craft_sourceModelIds');
    }
  };

  useEffect(() => {
    localStorage.setItem('craft_multiplier', multiplier.toString());
  }, [multiplier]);

  // Initial load only - do NOT auto-replace bet items with other identical items when inventory changes
  const isInitRef = useRef(false);
  useEffect(() => {
    if (!isInitRef.current) {
      isInitRef.current = true;
      try {
        const savedModelsJson = localStorage.getItem('craft_sourceModelIds');
        if (savedModelsJson) {
          const desiredModelIds = JSON.parse(savedModelsJson) as string[];
          const newSourceIds: string[] = [];
          const usedUniqueIds = new Set<string>();
          
          for (const modelId of desiredModelIds) {
            const item = inventory.find(i => i.id === modelId && !i.isWithdrawing && !usedUniqueIds.has(i.uniqueId));
            if (item) {
              newSourceIds.push(item.uniqueId);
              usedUniqueIds.add(item.uniqueId);
            }
          }
          if (newSourceIds.length > 0) {
            setSelectedIds(newSourceIds);
          }
        }
      } catch {}
    } else {
      // Keep only items that still exist in inventory; NEVER auto-fill others of the same model!
      setSelectedIds(prev => prev.filter(uid => inventory.some(i => i.uniqueId === uid && !i.isWithdrawing)));
    }
  }, [inventory]);

  useEffect(() => {
    return () => {
      if (pendingResultRef.current) {
        applyResultRef.current(pendingResultRef.current);
      }
    };
  }, []);

  const applyResultRef = useRef((resultData: any) => {});
  applyResultRef.current = (resultData: any) => {
    const { isWin, wonItem, refundAmount, idsToRemove, multiplier, totalValue } = resultData;
    
    setSelectedIds([]);
    localStorage.removeItem('craft_sourceModelIds');

    let newBal = balance;
    let newInv = [...inventory];
    
    if (isWin) {
      incrementStat('stat_craft_wins');
      recordGameProgress('craft', totalValue, multiplier, 1);
      if (refundAmount > 0 && setBalance) {
        setBalance((prev: number) => {
          newBal = prev + refundAmount;
          return newBal;
        });
      }
      setInventory((prev: any[]) => {
        newInv = [wonItem, ...prev.filter(i => !idsToRemove.includes(i.uniqueId))];
        return newInv;
      });
      onWin?.({ id: wonItem.id, name: wonItem.name, image_url: wonItem.image_url, slug: wonItem.slug, backdrop: wonItem.backdrop || 'Default' }, wonItem.price);
    } else {
      setInventory((prev: any[]) => {
        newInv = prev.filter(i => !idsToRemove.includes(i.uniqueId));
        return newInv;
      });
    }
    
    // Save state after applying
    setTimeout(() => {
      fetch('/api/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}`
        },
        body: JSON.stringify({ balance: newBal, inventory: newInv })
      }).catch(()=>{});
    }, 50);
  };

  const availableInventory = inventory.filter(i => !i.isWithdrawing);

  const selectedItems = useMemo(() => {
    return selectedIds.map(id => availableInventory.find(i => i.uniqueId === id)).filter(Boolean);
  }, [selectedIds, availableInventory]);

  const totalValue = selectedItems.reduce((acc, item) => acc + Number(item.floor_price_gram || item.price || 0), 0);
  const targetValue = totalValue * multiplier;
  
  const isBankTooHigh = totalValue > MAX_BANK;
  const isWinTooHigh = targetValue > MAX_WIN;

  const toggleSelection = (uniqueId: string) => {
    if (spinning) return;
    if (selectedIds.includes(uniqueId)) {
      setSelectedIds(prev => {
        const next = prev.filter(id => id !== uniqueId);
        saveModelsToLocal(next);
        return next;
      });
    } else {
      if (selectedIds.length < 10) {
        setSelectedIds(prev => {
          const next = [...prev, uniqueId];
          saveModelsToLocal(next);
          return next;
        });
      }
    }
  };

  const canCraft = selectedIds.length >= 2 && !spinning && !isBankTooHigh && !isWinTooHigh;

  const handleCraft = async () => {
    if (!canCraft) return;
    
    if (onTurnover) {
      onTurnover(totalValue);
    }
    
    setSpinning(true);
    
    const r = Math.random();
    let chance = 0;
    if (multiplier === 2) chance = 0.475; // 95% RTP
    else if (multiplier === 5) chance = 0.19; // 95% RTP
    else if (multiplier === 10) chance = 0.095; // 95% RTP
    else if (multiplier === 15) chance = 0.0633; // ~95% RTP
    else if (multiplier === 100) chance = 0.0095; // 95% RTP

    const isWin = r < chance;
    
    let wonItem = null;
    let refundAmount = 0;

    if (isWin) {
      // Craft output restricted to normal random NFTs without background (Default backdrop)
      const classicGifts = (giftsDb || []).filter(g => getNftBackdrop(g) === 'Default');
      const validItems = classicGifts.filter(i => (i.floor_price_gram || i.price || 0) <= targetValue);
      let target;
      if (validItems.length > 0) {
        // Pick randomly among the higher-tier items up to targetValue
        const topTier = validItems.filter(i => (i.floor_price_gram || i.price || 0) >= targetValue * 0.65);
        const pool = topTier.length > 0 ? topTier : validItems;
        target = pool[Math.floor(Math.random() * pool.length)];
      } else {
        target = [...classicGifts].sort((a, b) => (a.floor_price_gram || a.price || 0) - (b.floor_price_gram || b.price || 0))[0];
      }

      const itemPrice = Number(target?.floor_price_gram || target?.price || 0);
      wonItem = { ...target, uniqueId: Date.now().toString(), price: itemPrice, image_url: target.image_url };
      refundAmount = Math.max(0, Number((targetValue - itemPrice).toFixed(2)));
    }
    
    pendingResultRef.current = {
      isWin,
      wonItem,
      refundAmount,
      idsToRemove: [...selectedIds],
      multiplier,
      totalValue
    };
    
    // Simulate thinking/crafting delay
    await new Promise(r => setTimeout(r, 2000));
    
    if (pendingResultRef.current) {
      applyResultRef.current(pendingResultRef.current);
      pendingResultRef.current = null;
      
      setSelectedIds([]);
      localStorage.removeItem('craft_sourceModelIds');

      setResult({ 
        status: isWin ? 'win' : 'lose', 
        item: wonItem, 
        refund: refundAmount,
        lostItems: isWin ? undefined : selectedItems,
        totalValue: totalValue,
        multiplier: multiplier
      });
      setSpinning(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-canvas text-white relative">
      <button 
        onClick={() => {
          if (spinning && pendingResultRef.current) {
            applyResultRef.current(pendingResultRef.current);
            pendingResultRef.current = null;
          }
          onBack();
        }} 
        className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/[0.12] hover:bg-white/[0.20] border border-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer z-20"
      >
        <ArrowLeft className="w-4 h-4 text-white" />
      </button>
      <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-center pointer-events-none z-10">
        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">{t('craft_title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 pt-[72px]">
        <div className="mx-4 mt-4 bg-white/[0.07] backdrop-blur-2xl border border-white/[0.10] rounded-[28px] p-5 relative overflow-hidden flex flex-col items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(255,255,255,0.03),0_18px_45px_-16px_rgba(0,0,0,0.85)]">
          {/* верхний блик жидкого стекла */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
          />
          <div className="absolute inset-0 bg-brand/5 blur-3xl rounded-full pointer-events-none" />
          
          <h2 className="relative z-10 text-white/60 font-semibold mb-4 text-xs uppercase tracking-widest text-center">
            {t('choose_2_10')}
          </h2>
          
          <div className="grid grid-cols-5 gap-2 mb-5 z-10 relative w-full">
            {Array.from({ length: 10 }).map((_, index) => {
              const item = selectedItems[index];
              return (
                <div key={index} className="w-full aspect-[3/4] rounded-[16px] bg-white/[0.06] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col items-center justify-center relative overflow-hidden transition-all">
                  {item ? (
                    <>
                      <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-1 mt-1">
                        <PremiumImage staticMode src={item.image_url} alt={item.name} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                      </div>
                      <div className="relative z-20 w-full flex flex-col items-center justify-end pb-2 shrink-0">
                        <span className="text-[9px] font-bold text-white leading-none drop-shadow-md flex items-center justify-center gap-0.5 mt-0.5">{(Number(item.floor_price_gram || item.price || 0)).toFixed(2)} <GramIcon className="w-2.5 h-2.5" /></span>
                      </div>
                      <button onClick={() => toggleSelection(item.uniqueId)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white/70 hover:text-white z-30 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <Plus className="w-5 h-5 text-white/20 z-10" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-full mb-5 relative z-10">
            <h3 className="text-white/50 text-[10px] font-bold uppercase tracking-widest text-center mb-2">{t('choose_x')}</h3>
            <LiquidSegment
              ariaLabel="Множитель крафта"
              value={String(multiplier)}
              onChange={(value) => setMultiplier(Number(value))}
              options={MULTIPLIERS.map((m) => ({ value: String(m), label: `${m}x` }))}
            />
          </div>

          <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[20px] p-3.5 text-center z-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
             <div className="flex justify-between items-center px-1">
               <div className="text-left">
                 <div className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-0.5">{t('bank')}</div>
                 <div className={`text-sm font-bold flex items-center gap-1 ${isBankTooHigh ? 'text-red-400' : 'text-white'}`}>{totalValue.toFixed(2)} <GramIcon className="w-3.5 h-3.5 drop-shadow-md" /></div>
               </div>
               <div className="text-right">
                 <div className="text-brand text-[10px] font-semibold uppercase tracking-wider mb-0.5">{t('prize')}</div>
                 <div className={`text-sm font-bold flex items-center gap-1 justify-end ${isWinTooHigh ? 'text-red-400' : 'text-brand'}`}>{targetValue.toFixed(2)} <GramIcon className="w-3.5 h-3.5 drop-shadow-md" /></div>
               </div>
             </div>
             
             {(isBankTooHigh || isWinTooHigh) && (
               <div className="mt-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-2 flex items-center gap-2 text-red-400 text-[11px] text-left">
                 <AlertTriangle className="w-4 h-4 shrink-0" />
                 <span>
                   {isBankTooHigh ? <span className="flex items-center gap-1">{t('max_bank')} {MAX_BANK} <GramIcon className="w-3 h-3 drop-shadow-md" /> </span> : ''}
                   {isWinTooHigh ? <span className="flex items-center gap-1">{t('max_win')} {MAX_WIN} <GramIcon className="w-3 h-3 drop-shadow-md" /></span> : ''}
                 </span>
               </div>
             )}
          </div>
        </div>

        <div className="mt-8 px-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-white/50 text-[12px] font-bold uppercase tracking-widest">{t('inventory')}</h3>
            <span className="text-xs text-white/40 font-medium">({selectedIds.length}/10)</span>
          </div>
          <NftSelectorGrid
            inventory={availableInventory}
            selectedIds={selectedIds}
            onSelect={(item) => toggleSelection(item.uniqueId)}
            maxBetGram={MAX_BANK}
            emptyText={t('inventory_empty')}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pointer-events-none z-50">
        <button
          onClick={handleCraft}
          disabled={!canCraft}
          className="pointer-events-auto w-full py-4 rounded-full font-display font-bold text-[17px] tracking-wide shadow-[0_4px_24px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {spinning ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
               <Sparkles className="w-5 h-5" />
            </motion.div>
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {spinning ? t('crafting') : t('do_craft')}
        </button>
      </div>

      <AnimatePresence>
        {result && result.status === 'win' && (
          <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-sm px-6"
             onClick={() => { setResult(null); }}
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
                 <button onClick={() => setResult(null)} className="absolute top-0 right-1 p-1 text-white/40 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
               </div>
               <div className="relative overflow-hidden w-full aspect-square rounded-[20px] flex flex-col items-center p-1 transition-all duration-300">
                 <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-2">
                   <PremiumImage 
                     staticMode={false} 
                     loopWithDelay={true} 
                     loopDelayMs={5000} 
                     src={result.item?.image_url || `/nft/${result.item?.name}.png`} 
                     alt={result.item?.name} 
                     className="w-[85%] h-[85%] object-contain drop-shadow-lg" 
                   />
                 </div>
                 <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0 pb-1.5 px-1">
                   <span className="text-[12px] text-white/90 w-full text-center font-bold leading-tight line-clamp-2">{result.item?.name}</span>
                   <span className="text-[13px] font-bold text-white flex items-center justify-center gap-1 mt-0.5">{Number(result.item?.price || 0).toFixed(2)} <GramIcon className="w-3.5 h-3.5" /></span>
                 </div>
               </div>
               
               <div className="flex flex-col gap-1.5 w-full mt-1">
                 <div className="flex gap-1.5 w-full">
                   <button 
                     onClick={() => { setResult(null); if(onNavigate) onNavigate('upgrade'); }}
                     className="flex-1 py-2.5 rounded-[12px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-[0_2px_10px_rgba(34,197,94,0.35)] active:scale-95 transition-all cursor-pointer"
                   >
                     <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                     <span className="truncate">{t('upgrade')}</span>
                   </button>
                   <button 
                     onClick={() => { setResult(null); if(onNavigate) onNavigate('craft'); }}
                     className="flex-1 py-2.5 rounded-[12px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-[0_2px_10px_rgba(220,38,38,0.35)] active:scale-95 transition-all cursor-pointer"
                   >
                     <Shuffle className="w-3.5 h-3.5 shrink-0" />
                     <span className="truncate">{t('craft')}</span>
                   </button>
                   <button 
                     onClick={() => { setResult(null); if(onNavigate) onNavigate('mines'); }}
                     className="flex-1 py-2.5 rounded-[12px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#a855f7] text-white hover:bg-[#9333ea] shadow-[0_2px_10px_rgba(168,85,247,0.35)] active:scale-95 transition-all cursor-pointer"
                   >
                     <Bomb className="w-3.5 h-3.5 shrink-0" />
                     <span className="truncate">{t('mines_title') || 'Мины'}</span>
                   </button>
                 </div>
                 <button 
                   onClick={() => { setResult(null); if(onNavigate) onNavigate('inventory'); }}
                   className="w-full py-3 rounded-[12px] text-[12px] font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white hover:brightness-110 shadow-[0_4px_16px_rgba(0,152,234,0.4)] active:scale-[0.98] transition-all cursor-pointer"
                 >
                   {t('my_inventory')}
                 </button>
                 <button 
                   onClick={() => {
                     const itemPrice = Number(result.item?.price || 0);
                     setBalance((prev: number) => {
                       const newBal = Number((prev + itemPrice).toFixed(2));
                       setInventory((prevInv: any[]) => {
                         const newInv = prevInv.filter(i => i.uniqueId !== result.item?.uniqueId);
                         fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}` }, body: JSON.stringify({ balance: newBal, inventory: newInv }) }).catch(()=>{});
                         return newInv;
                       });
                       return newBal;
                     });
                     setResult(null);
                   }}
                   className="w-full py-3 flex items-center justify-center gap-1.5 rounded-[12px] text-[12px] font-bold bg-white/[0.12] hover:bg-white/[0.20] border border-white/[0.15] text-white active:scale-[0.98] transition-all cursor-pointer"
                 >
                   {t('sell')} {Number(result.item?.price || 0).toFixed(2)} <GramIcon className="w-4 h-4 opacity-80" />
                 </button>
               </div>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Beautiful Defeat Modal */}
      <GameLossModal
        isOpen={Boolean(result && result.status === 'lose')}
        onClose={() => { setResult(null); setSelectedIds([]); }}
        onRetry={() => {
          setResult(null);
          setSelectedIds([]);
        }}
        game="craft"
        onNavigate={onNavigate}
      />
    </div>
  );
}

