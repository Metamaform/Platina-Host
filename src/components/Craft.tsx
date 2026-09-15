import { useTranslation } from '../lib/i18n';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, X, Plus, Trash2, AlertTriangle, TrendingUp, Shuffle, Bomb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PremiumImage } from './PremiumImage';
import { incrementStat, recordGameProgress } from '../lib/stats';
import { GramIcon } from './GramIcon';

const MULTIPLIERS = [2, 5, 10, 15, 100];
const MAX_BANK = 2500;
const MAX_WIN = 5000;

export function Craft({ inventory, giftsDb, onBack, setInventory, onWin, onTurnover, balance, setBalance, onNavigate }: { inventory: any[], giftsDb: any[], onBack: () => void, setInventory: any, onWin?: (item: any, price: number) => void, onTurnover?: (amount: number) => void, balance: number, setBalance: any, onNavigate?: (target: string) => void }) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{status: 'win' | 'lose', item?: any, refund?: number} | null>(null);
  const [multiplier, setMultiplier] = useState<number>(2);
  const pendingResultRef = useRef<any>(null);

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
      onWin?.({ name: wonItem.name, image_url: wonItem.image_url, slug: wonItem.slug }, wonItem.price);
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
      setSelectedIds(prev => prev.filter(id => id !== uniqueId));
    } else {
      if (selectedIds.length < 10) {
        setSelectedIds(prev => [...prev, uniqueId]);
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
    if (multiplier === 2) chance = 0.45;
    else if (multiplier === 5) chance = 0.18;
    else if (multiplier === 10) chance = 0.09;
    else if (multiplier === 15) chance = 0.06;
    else if (multiplier === 100) chance = 0.008;

    const isWin = r < chance;
    
    let wonItem = null;
    let refundAmount = 0;

    if (isWin) {
      // Find the best item that fits within the targetValue
      const validItems = giftsDb.filter(i => i.floor_price_gram <= targetValue);
      let target;
      if (validItems.length > 0) {
        target = validItems.sort((a, b) => b.floor_price_gram - a.floor_price_gram)[0];
      } else {
        target = [...giftsDb].sort((a, b) => a.floor_price_gram - b.floor_price_gram)[0];
      }

      wonItem = { ...target, uniqueId: Date.now().toString(), price: target.floor_price_gram, image_url: target.image_url };
      refundAmount = Math.max(0, targetValue - target.floor_price_gram);
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
      
      setResult({ status: isWin ? 'win' : 'lose', item: wonItem, refund: refundAmount });
      setSelectedIds([]);
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
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-colors hover:bg-white/20 border border-white/5 z-20"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
      <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-center pointer-events-none z-10">
        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">{t('craft_title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 pt-[72px]">
        <div className="mx-4 mt-6 bg-surface border border-hairline rounded-[32px] p-6 relative flex flex-col items-center justify-center shadow-2xl">
          <div className="absolute inset-0 bg-brand/5 blur-3xl rounded-full pointer-events-none" />
          
          <h2 className="text-white/60 font-semibold mb-4 text-sm uppercase tracking-widest text-center">
            {t('choose_2_10')}
          </h2>
          
          <div className="grid grid-cols-5 gap-2 mb-6 z-10 relative w-full">
            {Array.from({ length: 10 }).map((_, index) => {
              const item = selectedItems[index];
              return (
                <div key={index} className="w-full aspect-[3/4] rounded-[16px] bg-[#181a20] border-2 border-white/5 flex flex-col items-center justify-center relative overflow-hidden transition-all shadow-lg shadow-black/20">
                  {item ? (
                    <>
                      <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-1 mt-1">
                        <PremiumImage staticMode src={item.image_url} alt={item.name} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                      </div>
                      <div className="relative z-20 w-full flex flex-col items-center justify-end pb-2 shrink-0">
                        <span className="text-[9px] font-bold text-white leading-none drop-shadow-md flex items-center justify-center gap-0.5 mt-0.5">{(Number(item.floor_price_gram || item.price || 0)).toFixed(2)} <GramIcon className="w-2.5 h-2.5" /></span>
                      </div>
                      <button onClick={() => toggleSelection(item.uniqueId)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white/70 hover:text-white z-30">
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

          <div className="w-full mb-6 relative z-10">
            <h3 className="text-white/50 text-[10px] font-bold uppercase tracking-widest text-center mb-2">{t('choose_x')}</h3>
            <div className="flex items-center justify-center gap-2">
              {MULTIPLIERS.map(m => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={`w-12 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${multiplier === m ? 'bg-brand text-black shadow-[0_0_15px_rgba(var(--brand),0.4)] scale-110' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>

          <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-center z-10">
             <div className="flex justify-between items-center mb-2 px-2">
               <div className="text-left">
                 <div className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-0.5">{t('bank')}</div>
                 <div className={`text-sm font-bold flex items-center gap-1 ${isBankTooHigh ? 'text-red-400' : 'text-white'}`}>{totalValue.toFixed(2)} <GramIcon className="w-3.5 h-3.5 drop-shadow-md" /></div>
               </div>
               <div className="text-right">
                 <div className="text-brand text-[10px] font-semibold uppercase tracking-wider mb-0.5">{t('prize')}</div>
                 <div className={`text-sm font-bold flex items-center gap-1 justify-end ${isWinTooHigh ? 'text-red-400' : 'text-gold'}`}>{targetValue.toFixed(2)} <GramIcon className="w-3.5 h-3.5 drop-shadow-md" /></div>
               </div>
             </div>
             
             {(isBankTooHigh || isWinTooHigh) && (
               <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-2 flex items-center gap-2 text-red-400 text-[11px] text-left">
                 <AlertTriangle className="w-4 h-4 shrink-0" />
                 <span>
                   {isBankTooHigh ? <span className="flex items-center gap-1">{t('max_bank')} {MAX_BANK} <GramIcon className="w-3 h-3 drop-shadow-md" /> </span> : ''}
                   {isWinTooHigh ? <span className="flex items-center gap-1">{t('max_win')} {MAX_WIN} <GramIcon className="w-3 h-3 drop-shadow-md" /></span> : ''}
                 </span>
               </div>
             )}
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-white/50 text-[12px] font-bold uppercase tracking-widest mb-4 px-5">{t('inventory')}</h3>
            {availableInventory.length === 0 ? (
              <p className="text-muted text-[14px] px-5 bg-white/5 mx-4 py-4 rounded-2xl text-center border border-white/5 border-dashed">{t('inventory_empty')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 px-5 pb-4">
                {availableInventory.map((item) => {
                  const isSelected = selectedIds.includes(item.uniqueId);
                  return (
                    <button
                      key={item.uniqueId || item.id || Math.random()}
                      onClick={() => toggleSelection(item.uniqueId)}
                      disabled={spinning}
                      className={`relative overflow-hidden w-full aspect-[3/4] max-w-[115px] mx-auto rounded-[24px] border-2 flex flex-col items-center p-2 transition-all ${
                        isSelected ? 'border-brand bg-brand/10 scale-95 opacity-50' : 'border-white/5 bg-[#181a20] hover:bg-[#1f2129]'
                      }`}
                    >
                      <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-2">
                        <PremiumImage staticMode src={item.image_url} alt={item.name} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                      </div>
                      <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0">
                        <span className="text-[11px] text-white/90 truncate w-[95%] text-center leading-none mb-1.5 drop-shadow-md">{item.name}</span>
                        <span className="text-[14px] font-bold text-white leading-none drop-shadow-md flex items-center justify-center gap-1">{item.floor_price_gram || item.price || 0} <GramIcon className="w-3.5 h-3.5 drop-shadow-md" /></span>
                      </div>
                      {isSelected && (
                         <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                           <div className="bg-brand text-black rounded-full p-1"><X className="w-4 h-4" /></div>
                         </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pointer-events-none z-50">
        <button
          onClick={handleCraft}
          disabled={!canCraft}
          className="pointer-events-auto w-full py-4.5 rounded-full font-black text-[17px] uppercase tracking-wide bg-brand text-black disabled:opacity-40 disabled:bg-white/10 disabled:text-white disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(var(--brand),0.3)] disabled:shadow-none"
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
        {result && (
          <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-sm px-6"
             onClick={() => { setResult(null); }}
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
               onClick={(e) => e.stopPropagation()}
               className={`w-full max-w-[280px] flex flex-col gap-2.5 mx-auto p-2 rounded-[28px] relative z-10 transition-all duration-300 shadow-2xl ${
                 result.status === 'win' 
                   ? 'border border-[#3b82f6]/20 bg-[#16181d] shadow-[0_4px_20px_-10px_rgba(59,130,246,0.1)]' 
                   : 'bg-[#1c0606] border border-[#3f0d0d] p-8 items-center overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)]'
               }`}
             >
               {result.status === 'win' ? (
                 <>
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
                         className="flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#22c55e] text-white hover:bg-[#16a34a] transition-colors"
                       >
                         <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                         <span className="truncate">{t('upgrade')}</span>
                       </button>
                       <button 
                         onClick={() => { setResult(null); if(onNavigate) onNavigate('craft'); }}
                         className="flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-colors"
                       >
                         <Shuffle className="w-3.5 h-3.5 shrink-0" />
                         <span className="truncate">{t('craft')}</span>
                       </button>
                       <button 
                         onClick={() => { setResult(null); if(onNavigate) onNavigate('mines'); }}
                         className="flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#a855f7] text-white hover:bg-[#9333ea] transition-colors"
                       >
                         <Bomb className="w-3.5 h-3.5 shrink-0" />
                         <span className="truncate">Mines</span>
                       </button>
                     </div>
                     <button 
                       onClick={() => { setResult(null); if(onNavigate) onNavigate('inventory'); }}
                       className="w-full py-3 rounded-[10px] text-[12px] font-bold flex items-center justify-center gap-1.5 bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors"
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
                       className="w-full py-3 flex items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-bold bg-[#2a2c33] text-white/90 hover:bg-white/10 transition-colors"
                     >
                       {t('sell')} {Number(result.item?.price || 0).toFixed(2)} <GramIcon className="w-4 h-4 opacity-80" />
                     </button>
                   </div>
                 </>
               ) : (
                 <>
                   <button onClick={() => setResult(null)} className="absolute top-4 right-4 text-white/40 hover:text-white z-10 transition-colors"><X className="w-5 h-5" /></button>
                   <div className="z-10 relative mt-2">
                     <div className="w-[120px] h-[120px] flex items-center justify-center text-danger/80 bg-danger/10 rounded-[28px]">
                       <Trash2 className="w-14 h-14" />
                     </div>
                   </div>
                   <h3 className="font-display text-[28px] font-bold z-10 tracking-tight text-white mt-2">{t('fail')}</h3>
                   <p className="text-white/60 text-[14px] text-center z-10 font-medium px-2 leading-relaxed">
                     {t('craft_fail')}
                   </p>
                   <button
                     onClick={() => setResult(null)}
                     className="mt-4 w-full py-4 rounded-[16px] font-bold text-[15px] uppercase tracking-wider z-10 transition-colors bg-white/10 text-white hover:bg-white/20 border border-white/10"
                   >
                     Close
                   </button>
                 </>
               )}
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

