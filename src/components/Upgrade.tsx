import { useTranslation } from '../lib/i18n';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, X, Settings, RefreshCw, Volume2, VolumeX, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { PremiumImage } from './PremiumNftImage';
import { incrementStat, recordGameProgress } from '../lib/stats';
import { GramIcon } from './GramIcon';
import { cleanNftName, getNftBackdrop } from '../lib/nftUtils';
import { UpgradeWheel } from './UpgradeWheel';
import { GameLossModal } from './GameLossModal';
import { LiquidSegment } from './ui/LiquidSegment';

export function Upgrade({ inventory, giftsDb, onBack, balance, setBalance, onWin, setInventory, onBet, onNavigate }: { inventory: any[], giftsDb: any[], onBack: () => void, balance: number, setBalance: any, onWin?: (item: any, price: number) => void, setInventory: any, onBet?: (amount: number) => void, onNavigate?: (target: string) => void }) {
  const { t } = useTranslation();
  
  // State
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [targetId, setTargetId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('upgrade_targetId') || null;
    } catch {
      return null;
    }
  });
  const [customChanceStr, setCustomChanceStr] = useState('');
  const [gramBetInput, setGramBetInput] = useState(() => {
    try {
      return localStorage.getItem('upgrade_gramBet') || '';
    } catch {
      return '';
    }
  });
  const gramBet = parseFloat(gramBetInput) || 0;
  const setGramBet = (val: any) => { if (typeof val === 'function') { setGramBetInput(prev => val(parseFloat(prev) || 0).toString()); } else { setGramBetInput(val.toString()); } };
  
  // Persist State
  const saveModelsToLocal = (uids: string[]) => {
    if (!uids || uids.length === 0) {
      localStorage.removeItem('upgrade_sourceModelIds');
      return;
    }
    const models = uids.map(uid => inventory.find(i => i.uniqueId === uid)?.id).filter(Boolean);
    if (models.length > 0) {
      localStorage.setItem('upgrade_sourceModelIds', JSON.stringify(models));
    } else {
      localStorage.removeItem('upgrade_sourceModelIds');
    }
  };

  useEffect(() => {
    if (targetId) {
      localStorage.setItem('upgrade_targetId', targetId);
    } else {
      localStorage.removeItem('upgrade_targetId');
    }
  }, [targetId]);

  useEffect(() => {
    localStorage.setItem('upgrade_gramBet', gramBetInput);
  }, [gramBetInput]);

  // Initial load only - do NOT auto-replace bet items with other identical items when inventory changes
  const isInitRef = useRef(false);
  useEffect(() => {
    if (!isInitRef.current) {
      isInitRef.current = true;
      try {
        const savedModelsJson = localStorage.getItem('upgrade_sourceModelIds');
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
            setSourceIds(newSourceIds);
          }
        }
      } catch {}
    } else {
      // Keep only items that still exist in inventory; NEVER auto-fill others of the same model!
      setSourceIds(prev => prev.filter(uid => inventory.some(i => i.uniqueId === uid && !i.isWithdrawing)));
    }
  }, [inventory]);

  const [activeTab, setActiveTab] = useState<'inventory' | 'targets'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [targetBackdropFilter, setTargetBackdropFilter] = useState<'black' | 'onyx' | null>(null);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [animSpeed, setAnimSpeed] = useState<'normal' | 'fast'>('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Animation & Result State
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{
    status: 'win' | 'lose';
    item?: any;
    lostSources?: any[];
    lostGram?: number;
    chance?: number;
    target?: any;
  } | null>(null);
  const [rotation, setRotation] = useState(0);
  const controls = useAnimation();
  const pendingResultRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (pendingResultRef.current) applyResultRef.current(pendingResultRef.current);
    };
  }, []);

  const applyResultRef = useRef((resultData: any) => {});
  applyResultRef.current = (resultData: any) => {
    const { isWin, wonItem, gramBetDeducted, removedSourceIds, multiplier } = resultData;
    setSourceIds([]);
    localStorage.removeItem('upgrade_sourceModelIds');
    if (isWin) {
      incrementStat('stat_upgrade_wins');
      recordGameProgress('upgrade', gramBetDeducted, multiplier, 1);
      setInventory((prev: any[]) => [wonItem, ...prev.filter(i => !removedSourceIds.includes(i.uniqueId))]);
      onWin?.({
        id: wonItem.id,
        name: wonItem.name,
        image_url: wonItem.image_url,
        slug: wonItem.slug,
        backdrop: wonItem.backdrop,
        pattern: wonItem.pattern
      }, wonItem.price);
    } else {
      setInventory((prev: any[]) => prev.filter(i => !removedSourceIds.includes(i.uniqueId)));
    }
  };

  const availableInventory = inventory.filter(i => !i.isWithdrawing);
  const selectedSources = availableInventory.filter(i => sourceIds.includes(i.uniqueId));
  const sourcePrice = selectedSources.reduce((sum, item) => sum + (item.floor_price_gram || item.price || 0), 0);
  const totalBet = sourcePrice + gramBet;

  const target = useMemo(() => giftsDb.find(t => t.id === targetId), [giftsDb, targetId]);

  const targetBackdrop = getNftBackdrop(target);
  const isTargetOnyx = targetBackdrop === 'Onyx Black';
  const isTargetBlack = targetBackdrop === 'Black';

  // Auto-deselect target if bet > target price
  useEffect(() => {
    if (target && (target.floor_price_gram || target.price || 0) <= totalBet) setTargetId(null);
  }, [totalBet, target]);

  let chance = target ? ((totalBet * 0.95) / (target.floor_price_gram || target.price || 0)) * 100 : 0;
  const visualChance = (!target && totalBet === 0) ? 50 : chance;
  if (chance > 95) chance = 95;

  const isBetTooHigh = sourcePrice > 2500;
  const canUpgrade = (sourceIds.length > 0 || gramBet >= 0.1) && target && balance >= gramBet && chance > 0 && !spinning && !isBetTooHigh;

  // Sound effects
  const playTick = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleUpgrade = async () => {
    if (!canUpgrade) return;
    
    // Server logic simulation
    setSpinning(true);
    if (gramBet > 0) setBalance((b: number) => b - gramBet);
    if (onBet && totalBet > 0) onBet(totalBet);

    let win = false;
    let finalAngle = 0;
    
    const totalSegments = 72;
    const greenSegmentsCount = Math.max(1, Math.min(totalSegments - 1, Math.round((chance / 100) * totalSegments)));

    try {
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}`
        },
        body: JSON.stringify({ betAmount: totalBet, targetPrice: target.floor_price_gram || target.price || 0 })
      });
      if (res.ok) {
        const data = await res.json();
        win = data.win;
        finalAngle = data.finalAngle;
      } else {
        // Fallback logic
        win = Math.random() * 100 < chance;
        const targetSegmentIndex = win
          ? Math.floor(Math.random() * greenSegmentsCount)
          : greenSegmentsCount + Math.floor(Math.random() * (totalSegments - greenSegmentsCount));
        finalAngle = (targetSegmentIndex + 0.5) * (360 / totalSegments);
      }
    } catch(e) {
      win = Math.random() * 100 < chance;
      const targetSegmentIndex = win
        ? Math.floor(Math.random() * greenSegmentsCount)
        : greenSegmentsCount + Math.floor(Math.random() * (totalSegments - greenSegmentsCount));
      finalAngle = (targetSegmentIndex + 0.5) * (360 / totalSegments);
    }

    // Ensure finalAngle strictly lands at the exact dead center of the chosen block
    const degPerSeg = 360 / totalSegments;
    let chosenSegmentIndex = Math.floor(finalAngle / degPerSeg);
    if (win && chosenSegmentIndex >= greenSegmentsCount) {
      chosenSegmentIndex = Math.floor(Math.random() * greenSegmentsCount);
    } else if (!win && chosenSegmentIndex < greenSegmentsCount) {
      chosenSegmentIndex = greenSegmentsCount + Math.floor(Math.random() * (totalSegments - greenSegmentsCount));
    }
    const exactCenterAngle = (chosenSegmentIndex + 0.5) * degPerSeg;

    const currentMod = rotation % 360;
    const diff = (exactCenterAngle - currentMod + 360) % 360;
    
    const spins = animSpeed === 'fast' ? 3 : 5;
    const targetRotation = rotation + (360 * spins) + diff; 
    
    let finalWonItem = null;
    if (win && target) {
      finalWonItem = {
        ...target,
        uniqueId: Date.now().toString(),
        price: target.floor_price_gram || target.price || 0,
        image_url: target.image_url,
        backdrop: target.backdrop || targetBackdrop
      };
    }

    const multiplier = totalBet > 0 && target ? (target.floor_price_gram || target.price || 0) / totalBet : 0;
    pendingResultRef.current = {
      isWin: win,
      wonItem: finalWonItem,
      gramBetDeducted: gramBet,
      removedSourceIds: sourceIds,
      multiplier
    };

    const duration = animSpeed === 'fast' ? 1.5 : 3.5;
    
    // Play tick sounds if enabled
    if (soundEnabled) {
      let ticks = 0;
      const interval = setInterval(() => {
        playTick();
        ticks++;
        if (ticks > (animSpeed === 'fast' ? 15 : 30)) clearInterval(interval);
      }, duration * 1000 / (animSpeed === 'fast' ? 15 : 30));
    }

    await controls.start({
      rotate: targetRotation,
      transition: { duration, ease: [0.15, 0.85, 0.35, 1] }
    });
    
    setRotation(targetRotation);

    if (pendingResultRef.current) {
      applyResultRef.current(pendingResultRef.current);
      pendingResultRef.current = null;
      setSourceIds([]);
      localStorage.removeItem('upgrade_sourceModelIds');
      setResult({ 
        status: win ? 'win' : 'lose', 
        item: win ? finalWonItem : target,
        lostSources: win ? undefined : selectedSources,
        lostGram: win ? undefined : gramBet,
        chance: Number(chance.toFixed(1)),
        target: target
      });
      setSpinning(false);
    }
  };

  const setChanceTarget = (chancePct: number) => {
    if (totalBet <= 0) return;
    const targetP = (totalBet * 95) / chancePct;
    const validTargets = giftsDb.filter(g => (g.floor_price_gram || g.price || 0) > totalBet);
    if (validTargets.length === 0) return;
    
    const closest = validTargets.reduce((prev, curr) => {
      const prevPrice = prev.floor_price_gram || prev.price || 0;
      const currPrice = curr.floor_price_gram || curr.price || 0;
      return (Math.abs(currPrice - targetP) < Math.abs(prevPrice - targetP)) ? curr : prev;
    });
    setTargetId(closest.id);
    setActiveTab('targets');
    setShowSettings(false);
  };

  const setMultiplierTarget = (mult: number) => {
    if (totalBet <= 0) return;
    const targetP = totalBet * mult;
    const validTargets = giftsDb.filter(g => (g.floor_price_gram || g.price || 0) > totalBet);
    if (validTargets.length === 0) return;
    
    const closest = validTargets.reduce((prev, curr) => {
      const prevPrice = prev.floor_price_gram || prev.price || 0;
      const currPrice = curr.floor_price_gram || curr.price || 0;
      return (Math.abs(currPrice - targetP) < Math.abs(prevPrice - targetP)) ? curr : prev;
    });
    setTargetId(closest.id);
    setActiveTab('targets');
    setShowSettings(false);
  };

  const filteredInventory = useMemo(() => {
    return availableInventory
      .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(i => {
        if (!targetBackdropFilter) return true;
        const b = getNftBackdrop(i);
        if (targetBackdropFilter === 'black') return b === 'Black';
        if (targetBackdropFilter === 'onyx') return b === 'Onyx Black';
        return true;
      })
      .sort((a, b) => {
        const diff = (a.floor_price_gram || a.price || 0) - (b.floor_price_gram || b.price || 0);
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [availableInventory, searchQuery, sortOrder, targetBackdropFilter]);

  const filteredTargets = useMemo(() => {
    return giftsDb
      .filter(g => (g.floor_price_gram || g.price || 0) > totalBet)
      .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(g => {
        const b = getNftBackdrop(g);
        const isOnyx = b === 'Onyx Black';
        const isBlack = b === 'Black';
        const isDefault = b === 'Default';

        if (targetBackdropFilter === 'black') return isBlack;
        if (targetBackdropFilter === 'onyx') return isOnyx;
        return isDefault;
      })
      .sort((a, b) => {
        const diff = (a.floor_price_gram || a.price || 0) - (b.floor_price_gram || b.price || 0);
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [giftsDb, totalBet, searchQuery, sortOrder, targetBackdropFilter]);

  return (
    <div className="h-full w-full flex flex-col bg-canvas text-white relative overflow-hidden">
      <audio ref={audioRef} src="/tick.mp3" preload="auto" />

      {/* Тот же ambient-фон, что и во всём приложении */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full bg-white/[0.07] blur-[160px]" />
      </div>
      
      <button onClick={() => {
            if (spinning && pendingResultRef.current) {
              applyResultRef.current(pendingResultRef.current);
              pendingResultRef.current = null;
            }
            onBack();
          }} 
          className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full lg-glass flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>

        <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-center pointer-events-none z-10">
          <h1 className="font-display text-lg font-bold text-white drop-shadow-md">{t('upgrade')}</h1>
        </div>

        <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full lg-glass flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer">
          <Settings className="w-4 h-4 text-white" />
        </button>

      <div className="flex-1 overflow-y-auto pb-[20px] pt-[72px] flex flex-col">
        {/* Top: Assembled Upgrade Wheel from Manifest */}
        <div className="relative w-full max-w-[370px] px-2 aspect-square flex items-center justify-center shrink-0 mx-auto">
          <UpgradeWheel 
            winChance={chance} 
            controls={controls} 
            isSpinning={spinning} 
            size={370} 
          />
        </div>

        {/* Middle: Selection Cards */}
        <div className="w-full px-4 grid grid-cols-2 gap-3 mb-4 mt-2">
          {/* Left Card: Input */}
          {(() => {
            const singleSrc = selectedSources.length === 1 ? selectedSources[0] : null;
            const singleSrcBackdrop = singleSrc ? getNftBackdrop(singleSrc) : 'Default';
            const isSingleOnyx = singleSrcBackdrop === 'Onyx Black';
            const isSingleBlack = singleSrcBackdrop === 'Black';

            return (
              <div className={`rounded-[22px] overflow-hidden relative min-h-[160px] flex flex-col border transition-all duration-300 p-3.5 ${
                isSingleBlack
                  ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/10'
                  : isSingleOnyx
                    ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/10'
                    : 'bg-white/[0.06] backdrop-blur-xl border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
              }`}>
                 <div className="text-center z-10 shrink-0 mb-1">
                   <h3 className="text-white font-bold text-[11px] leading-tight text-white/50 uppercase tracking-widest">{t('upgrade_source_items')}</h3>
                   {singleSrc && (isSingleOnyx || isSingleBlack) && (
                     <div className="w-full flex justify-center pt-0.5">
                       <span className={`text-[11px] font-bold uppercase tracking-widest ${
                         isSingleOnyx ? 'text-zinc-300' : 'text-zinc-400'
                       }`}>
                         {isSingleOnyx ? 'Onyx Black' : 'Black'}
                       </span>
                     </div>
                   )}
                 </div>
                 <div className="flex-1 w-full relative flex flex-col items-center justify-center">
                     {selectedSources.length === 1 ? (
                      <>
                        <PremiumImage staticMode src={selectedSources[0].image_url} alt={selectedSources[0].name} className="w-[48%] h-[48%] object-contain drop-shadow-xl" />
                        <span className="text-[11px] text-white/90 truncate w-full text-center font-bold mt-2">{cleanNftName(selectedSources[0].name)}</span>
                        <span className="text-[13px] font-bold text-white flex items-center justify-center gap-1 mt-0.5">{Number(selectedSources[0].floor_price_gram || selectedSources[0].price || 0).toFixed(2)} <GramIcon className="w-3 h-3" /></span>
                        <button onClick={(e) => { 
                          e.stopPropagation(); 
                          setSourceIds([]);
                          saveModelsToLocal([]);
                        }} className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-500 rounded-full p-1 cursor-pointer"><X className="w-3 h-3 text-white" /></button>
                      </>
                    ) : selectedSources.length > 1 ? (
                      <div className="flex flex-wrap items-center justify-center gap-1 mb-2">
                        {selectedSources.slice(0, 3).map((src, idx) => {
                          const srcB = getNftBackdrop(src);
                          return (
                            <div key={idx} className={`relative w-14 h-14 rounded-[12px] border flex items-center justify-center ${
                              srcB === 'Black'
                                ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/10'
                                : srcB === 'Onyx Black'
                                  ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/10'
                                  : 'bg-white/[0.08] border-white/[0.10]'
                            }`}>
                              <PremiumImage staticMode src={src.image_url} alt={src.name} className="w-[54%] h-[54%] object-contain" />
                              <button onClick={(e) => { 
                                e.stopPropagation(); 
                                setSourceIds(prev => {
                                  const next = prev.filter(id => id !== src.uniqueId);
                                  saveModelsToLocal(next);
                                  return next;
                                }); 
                              }} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 cursor-pointer"><X className="w-2.5 h-2.5 text-white" /></button>
                            </div>
                          );
                        })}
                        {selectedSources.length > 3 && <div className="text-[10px] text-white/50">+{selectedSources.length - 3}</div>}
                      </div>
                    ) : (
                      <div className="text-[10px] text-white/40 mb-2 text-center">{t('upgrade_select_items_below')}</div>
                    )}
                 </div>
              </div>
            );
          })()}

           {/* Right Card: Target */}
          <div className={`rounded-[22px] overflow-hidden relative min-h-[160px] flex flex-col border transition-all duration-300 p-3.5 ${
            isTargetBlack 
              ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/10' 
              : isTargetOnyx 
                ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/10' 
                : 'bg-white/[0.06] backdrop-blur-xl border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          }`}>
             <div className="text-center z-10 shrink-0 mb-1">
               <h3 className="text-white font-bold text-[11px] leading-tight text-white/50 uppercase tracking-widest">{t('target_item')}</h3>
               {target && (isTargetOnyx || isTargetBlack) && (
                 <div className="w-full flex justify-center pt-0.5">
                   <span className={`text-[11px] font-bold uppercase tracking-widest ${
                     isTargetOnyx ? 'text-zinc-300' : 'text-zinc-400'
                   }`}>
                     {isTargetOnyx ? 'Onyx Black' : 'Black'}
                   </span>
                 </div>
               )}
             </div>
             <div className="flex-1 w-full relative flex flex-col items-center justify-center">
                {target ? (
                  <>
                    <PremiumImage staticMode src={target.image_url} alt={target.name} className="w-[48%] h-[48%] object-contain drop-shadow-xl" />
                    <span className="text-[11px] text-white/90 truncate w-full text-center font-bold mt-2">{cleanNftName(target.name)}</span>
                    <span className="text-[13px] font-bold text-brand flex items-center justify-center gap-1 mt-0.5">{Number(target.floor_price_gram || target.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" /></span>
                  </>
                ) : (
                  <div className="text-[10px] text-white/40 text-center">{t('upgrade_select_item_below')}</div>
                )}
             </div>
          </div>
        </div>


        {/* GRAM Bet block in Liquid Glass */}
        <div className="w-full px-4 mb-4 space-y-2">
          <div className="bg-white/[0.05] backdrop-blur-xl rounded-[22px] p-3 flex items-center justify-between border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
             <span className="text-white/50 text-[12px] font-bold uppercase tracking-wider ml-1">{t('bet_nft')}</span>
             <div className="flex items-center gap-2 lg-glass px-3.5 py-1.5 rounded-full">
               <input
                 type="text"
                 inputMode="decimal"
                 value={gramBetInput}
                 onChange={(e) => {
                   const val = e.target.value.replace(',', '.');
                   if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                     if (val !== '' && parseFloat(val) > balance) setGramBetInput(balance.toString());
                     else setGramBetInput(val);
                   }
                 }}
                 placeholder="0.00"
                 className="bg-transparent text-right text-white font-bold text-[14px] w-20 outline-none placeholder:text-white/20"
                 disabled={spinning}
               />
               <GramIcon className="w-4 h-4 text-brand" />
             </div>
          </div>
          <div className="flex items-center justify-between px-2">
             <span className="text-white/40 text-[11px] uppercase tracking-widest font-bold">{t('total_cost')}</span>
             <span className="text-brand font-bold text-[13px] flex items-center gap-1">{totalBet.toFixed(2)} <GramIcon className="w-3.5 h-3.5"/></span>
          </div>
        </div>
        {/* Upgrade Button */}
        <div className="px-4 mb-6">
          <button 
            onClick={handleUpgrade}
            disabled={!canUpgrade}
            className="w-full py-4 rounded-full font-display font-bold text-[17px] tracking-wide shadow-[0_4px_24px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase"
          >
            {t('upgrade')}
          </button>
        </div>

        {/* Bottom Section: Inventory & Targets in Liquid Glass */}
        <div className="flex-1 bg-[#16171b]/95 backdrop-blur-2xl rounded-t-[32px] pt-5 px-4 border-t border-white/[0.12] flex flex-col min-h-[400px] shadow-2xl relative overflow-hidden">
          {/* верхний блик жидкого стекла */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-t-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
          />

          {/* Tabs */}
          <div className="relative z-10 mb-4 shrink-0 w-full flex rounded-2xl bg-white/[0.04] p-1 border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {t('upgrade_my_items') || 'Мои предметы'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('targets')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'targets'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {t('upgrade_targets') || 'Желаемые'}
            </button>
          </div>

          {/* Filters */}
          <div className="relative z-10 flex items-center gap-2 mb-4 shrink-0">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder={t('search_item')} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/[0.12] rounded-full py-2 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setTargetBackdropFilter(prev => prev === 'black' ? null : 'black')}
              className={`py-2 px-3 rounded-full text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
                targetBackdropFilter === 'black'
                  ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/50 text-white shadow-md ring-1 ring-white/30'
                  : 'lg-glass text-white'
              }`}
              title={t('filter_black')}
            >
              <span className="w-2 h-2 rounded-full bg-black border border-white/40 inline-block shrink-0" />
              <span>Black</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetBackdropFilter(prev => prev === 'onyx' ? null : 'onyx')}
              className={`py-2 px-2.5 rounded-full text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                targetBackdropFilter === 'onyx'
                  ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/50 text-white shadow-md ring-1 ring-white/30'
                  : 'lg-glass text-white'
              }`}
              title={t('filter_onyx')}
            >
              <span className="w-2 h-2 rounded-full bg-[#393d3f] border border-white/40 inline-block shrink-0" />
              <span>Onyx Black</span>
            </button>
            <button 
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="lg-glass rounded-full px-3 py-2 text-[12px] font-bold text-white flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {t('price')} {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
            {activeTab === 'inventory' ? (
              filteredInventory.length === 0 ? (
                 <p className="text-white/40 text-[13px] text-center mt-6">{t('no_available_items')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredInventory.map(item => {
                    const isSelected = sourceIds.includes(item.uniqueId);
                    const itemBackdrop = getNftBackdrop(item);
                    const isOnyx = itemBackdrop === 'Onyx Black';
                    const isBlack = itemBackdrop === 'Black';
                    const itemPrice = Number(item.floor_price_gram || item.price || 0);
                    const isOverLimit = itemPrice > 2500 || (!isSelected && sourcePrice + itemPrice > 2500);

                    return (
                      <button
                        key={item.uniqueId}
                        disabled={isOverLimit && !isSelected}
                        onClick={() => {
                          if (isSelected) {
                            setSourceIds(prev => {
                              const next = prev.filter(id => id !== item.uniqueId);
                              saveModelsToLocal(next);
                              return next;
                            });
                          } else {
                            if (isOverLimit) return;
                            setSourceIds(prev => {
                              const next = [...prev, item.uniqueId];
                              saveModelsToLocal(next);
                              return next;
                            });
                          }
                        }}
                        className={`relative overflow-hidden w-full aspect-[3/4] rounded-[16px] border flex flex-col items-center p-2 transition-all ${
                          isOverLimit && !isSelected ? 'opacity-40 cursor-not-allowed border-white/5 bg-[#181a20]' :
                          isSelected 
                            ? 'border-brand bg-[#fbc740]/10 scale-95 shadow-[0_4px_15px_rgba(251,199,64,0.15)]' 
                            : isBlack 
                              ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/10' 
                              : isOnyx 
                                ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/10' 
                                : 'border-white/5 bg-[#181a20] hover:bg-[#1f2129]'
                        }`}
                      >
                        {(isOnyx || isBlack) && (
                          <span className={`absolute top-1.5 left-0 right-0 z-20 text-[9px] font-bold uppercase tracking-widest text-center ${
                            isOnyx ? 'text-zinc-300' : 'text-zinc-400'
                          }`}>
                            {isOnyx ? 'Onyx Black' : 'Black'}
                          </span>
                        )}
                        <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-1">
                          <PremiumImage staticMode src={item.image_url} alt={item.name} className="w-[51%] h-[51%] object-contain drop-shadow-md" />
                        </div>
                        <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0">
                          <span className="text-[10px] text-white/90 truncate w-[95%] text-center leading-none mb-1">{cleanNftName(item.name)}</span>
                          <div className="flex items-center justify-center gap-1 w-full">
                            <span className="text-[12px] font-bold text-white flex items-center gap-1">{Number(item.floor_price_gram || item.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" /></span>
                            {itemPrice > 2500 && (
                              <span className="text-[8px] font-bold text-red-400 bg-red-500/20 px-1 py-0.5 rounded border border-red-500/30 whitespace-nowrap">
                                &gt;2500
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              (!sourceIds.length && gramBet <= 0) ? (
                 <p className="text-white/40 text-[13px] text-center mt-6">{t('upgrade_select_bet_first')}</p>
              ) : filteredTargets.length === 0 ? (
                 <p className="text-white/40 text-[13px] text-center mt-6">{t('upgrade_no_matching')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredTargets.map((g, idx) => {
                    const isSelected = targetId === g.id;
                    const gBackdrop = getNftBackdrop(g);
                    const isOnyx = gBackdrop === 'Onyx Black';
                    const isBlack = gBackdrop === 'Black';

                    return (
                      <button
                        key={g.uniqueId || `${g.id || 'target'}-${idx}`}
                        onClick={() => setTargetId(isSelected ? null : g.id)}
                        className={`relative overflow-hidden w-full aspect-square rounded-[16px] border flex flex-col items-center justify-end pb-2 transition-all ${
                          isSelected 
                            ? 'border-brand bg-[#fbc740]/10 scale-95 shadow-[0_4px_15px_rgba(251,199,64,0.15)]' 
                            : isBlack 
                              ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/10' 
                              : isOnyx 
                                ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/10' 
                                : 'border-white/5 bg-[#181a20] hover:bg-[#1f2129]'
                        }`}
                      >
                        {(isOnyx || isBlack) && (
                          <span className={`absolute top-1.5 left-0 right-0 z-20 text-[9px] font-bold uppercase tracking-widest text-center ${
                            isOnyx ? 'text-zinc-300' : 'text-zinc-400'
                          }`}>
                            {isOnyx ? 'Onyx Black' : 'Black'}
                          </span>
                        )}
                        <div className="absolute inset-0 z-0 flex items-center justify-center p-3 pb-8">
                          <PremiumImage staticMode src={g.image_url} alt={g.name} className="w-[56%] h-[56%] object-contain" />
                        </div>
                        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="relative z-20 w-full flex flex-col items-center justify-end">
                          <span className="text-[10px] text-white/90 truncate w-[90%] text-center leading-none mb-1">{cleanNftName(g.name)}</span>
                          <span className="text-[12px] font-bold text-brand flex items-center gap-1">{Number(g.floor_price_gram || g.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" /></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full bg-[#121316] border-t border-white/10 rounded-t-[32px] p-6 pb-12 shadow-2xl z-10 flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-xl font-bold">{t('upgrade_settings')}</h3>
                <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full lg-glass flex items-center justify-center text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Chances */}
                <div className="space-y-3">
                  <span className="text-[13px] text-white/50 font-bold uppercase tracking-wider">{t('success_chance')}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {[20, 35, 50, 70, 80].map(c => (
                      <button key={c} onClick={() => setChanceTarget(c)} className="flex-1 min-w-[60px] py-3 rounded-xl lg-glass text-[15px] font-bold text-white transition-all cursor-pointer active:scale-95">{c}%</button>
                    ))}
                    <button onClick={() => setTargetId(null)} className="w-[50px] h-[50px] shrink-0 rounded-xl lg-glass flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer active:scale-95">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        placeholder={t('custom_chance_ph')}
                        value={customChanceStr}
                        onChange={(e) => setCustomChanceStr(e.target.value)}
                        className="w-full bg-[#1a1b1f] border border-white/10 rounded-xl py-3 px-4 text-[15px] font-bold text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-colors"
                        min="0.1"
                        max="95"
                        step="0.1"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        let val = parseFloat(customChanceStr.replace(',', '.'));
                        if (!isNaN(val)) {
                          if (val > 95) val = 95;
                          if (val < 0.1) val = 0.1;
                          setChanceTarget(val);
                        }
                      }}
                      className="py-3 px-5 rounded-xl bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white font-bold hover:brightness-110 transition-all shadow-[0_0_14px_rgba(0,152,234,0.45)] active:scale-95 shrink-0 cursor-pointer"
                    >
                      {t('choose')}
                    </button>
                  </div>
                </div>

                {/* Multipliers */}
                <div className="space-y-3">
                  <span className="text-[13px] text-white/50 font-bold uppercase tracking-wider">{t('quick_multiplier')}</span>
                  <div className="flex items-center gap-2">
                    {[2, 4, 8].map(m => (
                      <button key={m} onClick={() => setMultiplierTarget(m)} className="flex-1 py-3 rounded-xl lg-glass text-[15px] font-bold text-white transition-all cursor-pointer active:scale-95">x{m}</button>
                    ))}
                  </div>
                </div>

                {/* Speed */}
                <div className="space-y-3">
                  <span className="text-[13px] text-white/50 font-bold uppercase tracking-wider">{t('anim_speed')}</span>
                  <div className="flex bg-white/[0.06] border border-white/[0.10] rounded-[16px] p-1">
                    <button onClick={() => setAnimSpeed('normal')} className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-all cursor-pointer ${animSpeed === 'normal' ? 'bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white shadow-[0_0_12px_rgba(0,152,234,0.4)]' : 'text-white/60 hover:text-white'}`}>{t('speed_normal')}</button>
                    <button onClick={() => setAnimSpeed('fast')} className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-all cursor-pointer ${animSpeed === 'fast' ? 'bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white shadow-[0_0_12px_rgba(0,152,234,0.4)]' : 'text-white/60 hover:text-white'}`}>{t('speed_fast')}</button>
                  </div>
                </div>

                {/* Sound */}
                <div className="space-y-3">
                  <span className="text-[13px] text-white/50 font-bold uppercase tracking-wider">{t('sound_label')}</span>
                  <div className="flex bg-white/[0.06] border border-white/[0.10] rounded-[16px] p-1">
                    <button onClick={() => setSoundEnabled(true)} className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${soundEnabled ? 'bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white shadow-[0_0_12px_rgba(0,152,234,0.4)]' : 'text-white/60 hover:text-white'}`}><Volume2 className="w-4 h-4" /> {t('enabled')}</button>
                    <button onClick={() => setSoundEnabled(false)} className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${!soundEnabled ? 'bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white shadow-[0_0_12px_rgba(0,152,234,0.4)]' : 'text-white/60 hover:text-white'}`}><VolumeX className="w-4 h-4" /> {t('disabled')}</button>
                  </div>
                </div>

              </div>

              <button onClick={() => setShowSettings(false)} className="mt-8 w-full py-4 rounded-full font-bold text-[15px] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white transition-all shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] cursor-pointer active:scale-[0.98]">
                {t('save_and_close')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Win Modal */}
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
               className={`w-full max-w-[280px] flex flex-col gap-2.5 mx-auto p-2 rounded-[28px] relative z-10 transition-all duration-300 shadow-2xl ${
                 getNftBackdrop(result.item) === 'Black'
                   ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.5)]'
                   : getNftBackdrop(result.item) === 'Onyx Black'
                     ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.4)]'
                     : 'border border-[#3b82f6]/20 bg-[#16181d] shadow-[0_4px_20px_-10px_rgba(59,130,246,0.1)]'
               }`}
             >
               <div className="w-full flex justify-center pt-2 relative">
                 <div className="flex flex-col items-center">
                   {(() => {
                     const wonBackdrop = getNftBackdrop(result.item);
                     const isOnyx = wonBackdrop === "Onyx Black";
                     const isBlack = wonBackdrop === "Black";
                     if (!isOnyx && !isBlack) return null;
                     return (
                       <span className={`text-[11px] font-bold uppercase tracking-widest ${
                         isOnyx ? "text-zinc-300" : "text-zinc-400"
                       }`}>
                         {isOnyx ? "Onyx Black" : "Black"}
                       </span>
                     );
                   })()}
                   <span className="text-[13px] font-black text-[#22c55e] uppercase tracking-widest mt-0.5">{t('upgrade_success_short')}</span>
                 </div>
                 <button onClick={() => { setResult(null); }} className="absolute top-0 right-1 p-1 text-white/40 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
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
                   <span className="text-[14px] text-white/90 w-full text-center font-bold leading-tight line-clamp-2">{cleanNftName(result.item?.name)}</span>
                   <span className="text-[15px] font-bold text-brand flex items-center justify-center gap-1 mt-1">{Number(result.item?.price || 0).toFixed(2)} <GramIcon className="w-4 h-4" /></span>
                 </div>
               </div>
               
               <div className="flex flex-col gap-1.5 w-full mt-1">
                 <button 
                   onClick={() => { setResult(null); }}
                   className="w-full py-3.5 rounded-[16px] text-[14px] font-bold flex items-center justify-center bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] text-white shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                 >
                   {t('great')}
                 </button>
               </div>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Beautiful Defeat Modal */}
      <GameLossModal
        isOpen={Boolean(result && result.status === 'lose')}
        onClose={() => setResult(null)}
        onRetry={() => {
          setResult(null);
        }}
        game="upgrade"
        onNavigate={onNavigate}
      />
    </div>
  );
}
