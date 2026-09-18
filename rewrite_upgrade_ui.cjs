const fs = require('fs');

const content = `import { useTranslation } from '../lib/i18n';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, X, Settings, RefreshCw, Volume2, VolumeX, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { PremiumImage } from './PremiumImage';
import { incrementStat, recordGameProgress } from '../lib/stats';
import { GramIcon } from './GramIcon';

export function Upgrade({ inventory, giftsDb, onBack, balance, setBalance, onWin, setInventory, onBet, onNavigate }: { inventory: any[], giftsDb: any[], onBack: () => void, balance: number, setBalance: any, onWin?: (item: any, price: number) => void, setInventory: any, onBet?: (amount: number) => void, onNavigate?: (target: string) => void }) {
  const { t } = useTranslation();
  
  // State
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [gramBetInput, setGramBetInput] = useState('');
  const gramBet = parseFloat(gramBetInput) || 0;
  const setGramBet = (val: any) => { if (typeof val === 'function') { setGramBetInput(prev => val(parseFloat(prev) || 0).toString()); } else { setGramBetInput(val.toString()); } };
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'targets'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [animSpeed, setAnimSpeed] = useState<'normal' | 'fast'>('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Animation & Result State
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{status: 'win' | 'lose', item?: any} | null>(null);
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
    if (isWin) {
      incrementStat('stat_upgrade_wins');
      recordGameProgress('upgrade', gramBetDeducted, multiplier, 1);
      setInventory((prev: any[]) => [wonItem, ...prev.filter(i => !removedSourceIds.includes(i.uniqueId))]);
      onWin?.({ name: wonItem.name, image_url: wonItem.image_url, slug: wonItem.slug }, wonItem.price);
    } else {
      setInventory((prev: any[]) => prev.filter(i => !removedSourceIds.includes(i.uniqueId)));
    }
  };

  const availableInventory = inventory.filter(i => !i.isWithdrawing);
  const selectedSources = availableInventory.filter(i => sourceIds.includes(i.uniqueId));
  const sourcePrice = selectedSources.reduce((sum, item) => sum + (item.floor_price_gram || item.price || 0), 0);
  const totalBet = sourcePrice + gramBet;

  const target = useMemo(() => giftsDb.find(t => t.id === targetId), [giftsDb, targetId]);

  // Auto-deselect target if bet > target price
  useEffect(() => {
    if (target && target.floor_price_gram <= totalBet) setTargetId(null);
  }, [totalBet, target]);

  let chance = target ? (totalBet / target.floor_price_gram) * 100 : 0;
  if (chance > 95) chance = 95;

  const canUpgrade = (sourceIds.length > 0 || gramBet >= 0.1) && target && balance >= gramBet && chance > 0 && !spinning;

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
    
    try {
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${sessionStorage.getItem('pg_session_token')}\`
        },
        body: JSON.stringify({ betAmount: totalBet, targetPrice: target.floor_price_gram })
      });
      if (res.ok) {
        const data = await res.json();
        win = data.win;
        finalAngle = data.finalAngle;
      } else {
         // Fallback logic
         win = Math.random() * 100 < chance;
         const winAngle = (chance / 100) * 360;
         if (win) finalAngle = 360 - (Math.random() * winAngle);
         else finalAngle = 360 - (winAngle + Math.random() * (360 - winAngle));
      }
    } catch(e) {
       win = Math.random() * 100 < chance;
       const winAngle = (chance / 100) * 360;
       if (win) finalAngle = 360 - (Math.random() * winAngle);
       else finalAngle = 360 - (winAngle + Math.random() * (360 - winAngle));
    }

    const currentMod = rotation % 360;
    const diff = finalAngle - currentMod;
    
    const spins = animSpeed === 'fast' ? 3 : 6;
    const targetRotation = rotation + (360 * spins) + diff; 
    
    let finalWonItem = null;
    if (win) {
      finalWonItem = { ...target, uniqueId: Date.now().toString(), price: target.floor_price_gram, image_url: target.image_url };
    }

    const multiplier = totalBet > 0 && target ? target.floor_price_gram / totalBet : 0;
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
      setResult({ status: win ? 'win' : 'lose', item: win ? finalWonItem : target });
      setSpinning(false);
    }
  };

  const setMultiplierTarget = (mult: number) => {
    if (totalBet <= 0) return;
    const targetP = totalBet * mult;
    const validTargets = giftsDb.filter(g => g.floor_price_gram > totalBet);
    if (validTargets.length === 0) return;
    
    const closest = validTargets.reduce((prev, curr) => {
      return (Math.abs(curr.floor_price_gram - targetP) < Math.abs(prev.floor_price_gram - targetP)) ? curr : prev;
    });
    setTargetId(closest.id);
    setActiveTab('targets');
    setShowSettings(false);
  };

  const filteredInventory = useMemo(() => {
    return availableInventory
      .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const diff = (a.floor_price_gram || a.price || 0) - (b.floor_price_gram || b.price || 0);
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [availableInventory, searchQuery, sortOrder]);

  const filteredTargets = useMemo(() => {
    return giftsDb
      .filter(g => g.floor_price_gram > totalBet)
      .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const diff = a.floor_price_gram - b.floor_price_gram;
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [giftsDb, totalBet, searchQuery, sortOrder]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a0c] text-white relative">
      <audio ref={audioRef} src="/tick.mp3" preload="auto" />
      
      {/* Top Header */}
      <div className="relative h-[72px] flex items-center justify-between px-4 shrink-0 z-20">
        <button onClick={() => {
            if (spinning && pendingResultRef.current) {
              applyResultRef.current(pendingResultRef.current);
              pendingResultRef.current = null;
            }
            onBack();
          }} 
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-colors hover:bg-white/20 border border-white/5"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">Апгрейд</h1>
        <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-colors hover:bg-white/20 border border-white/5">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-[20px] flex flex-col">
        {/* Top: Large Wheel */}
        <div className="relative w-full max-w-[320px] aspect-square flex justify-center shrink-0 mx-auto">
          <div className="relative w-[300px] h-[300px]">
            <div className="w-full h-full rotate-90">
              <motion.div className="w-full h-full drop-shadow-2xl relative" animate={controls}>
                <img src="/krug_apgreyd.png" className="absolute inset-0 w-full h-full object-contain scale-[1.05]" alt="wheel frame" />
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible relative z-10">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#252525" strokeWidth="8" strokeOpacity="0.9" />
                  <circle 
                    cx="50" cy="50" r="44" fill="none" stroke="#fbc740" strokeWidth="8" 
                    strokeDasharray={\`\${(chance / 100) * 276.46} 276.46\`}
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 10px rgba(251,199,64,0.6))" }}
                  />
                </svg>
              </motion.div>
            </div>
            
            {/* Bottom Pointer */}
            <div className="absolute -bottom-[20px] left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] scale-[1.3] rotate-180">
              <svg width="26" height="30" viewBox="0 0 26 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 28 L4 4 L13 9 Z" fill="url(#ptr_left)" />
                <path d="M13 28 L13 9 L22 4 Z" fill="url(#ptr_right)" />
                <path d="M13 28 L4 4 L13 9 L22 4 Z" stroke="#fbc740" strokeWidth="2.5" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="ptr_left" x1="8.5" y1="4" x2="8.5" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fbc740" />
                    <stop offset="1" stopColor="#d4a017" />
                  </linearGradient>
                  <linearGradient id="ptr_right" x1="17.5" y1="4" x2="17.5" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#d4a017" />
                    <stop offset="1" stopColor="#997300" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Inner Circle Content */}
            <div className="absolute inset-[15%] bg-gradient-to-b from-[#1c1d21] to-[#131417] rounded-full shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center pointer-events-none border-[2px] border-[#25272c]">
               <span className="text-[24px] font-display font-black text-white drop-shadow-[0_0_15px_rgba(251,199,64,0.6)]">{chance.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Middle: Selection Cards */}
        <div className="w-full px-4 grid grid-cols-2 gap-3 mb-4 mt-6">
          {/* Left Card: Input */}
          <div className="bg-[#151619] rounded-[16px] overflow-hidden relative min-h-[160px] flex flex-col border border-white/5 p-3">
             <div className="text-center z-10 shrink-0 mb-2">
               <h3 className="text-white font-bold text-[11px] leading-tight text-white/50 uppercase tracking-widest">Отдаваемые предметы</h3>
             </div>
             <div className="flex-1 w-full flex flex-col items-center justify-center">
                {selectedSources.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-1 mb-2">
                    {selectedSources.slice(0, 3).map((src, idx) => (
                      <div key={idx} className="relative w-10 h-10 bg-[#1c1d21] rounded-lg border border-white/10 flex items-center justify-center">
                        <PremiumImage staticMode src={src.image_url} alt={src.name} className="w-[80%] h-[80%] object-contain" />
                        <button onClick={(e) => { e.stopPropagation(); setSourceIds(prev => prev.filter(id => id !== src.uniqueId)); }} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5"><X className="w-2.5 h-2.5 text-white" /></button>
                      </div>
                    ))}
                    {selectedSources.length > 3 && <div className="text-[10px] text-white/50">+{selectedSources.length - 3}</div>}
                  </div>
                ) : (
                  <div className="text-[10px] text-white/40 mb-2 text-center">Выберите предметы ниже</div>
                )}
                
                {/* Balance Input */}
                <div className="flex flex-col items-center gap-1 w-full mt-auto">
                  <div className="flex items-center gap-1.5 bg-[#0d0d0f] px-2 py-1.5 rounded-[8px] border border-white/5 w-full">
                    <GramIcon className="w-3.5 h-3.5 text-[#fbc740]" />
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
                      placeholder="0.0 Баланс"
                      className="bg-transparent text-left text-white font-bold text-[12px] w-full outline-none placeholder:text-white/20"
                      disabled={spinning}
                    />
                  </div>
                  <span className="text-[13px] font-bold text-[#fbc740] flex items-center justify-center gap-1 mt-1">
                    Общ: {totalBet.toFixed(2)} <GramIcon className="w-3 h-3" />
                  </span>
                </div>
             </div>
          </div>

          {/* Right Card: Target */}
          <div className="bg-[#151619] rounded-[16px] overflow-hidden relative min-h-[160px] flex flex-col border border-white/5 p-3">
             <div className="text-center z-10 shrink-0 mb-2">
               <h3 className="text-white font-bold text-[11px] leading-tight text-white/50 uppercase tracking-widest">Желаемый предмет</h3>
             </div>
             <div className="flex-1 w-full relative flex flex-col items-center justify-center">
                {target ? (
                  <>
                    <PremiumImage staticMode src={target.image_url} alt={target.name} className="w-[60%] h-[60%] object-contain drop-shadow-xl" />
                    <span className="text-[11px] text-white/90 truncate w-full text-center font-bold mt-2">{target.name}</span>
                    <span className="text-[13px] font-bold text-[#fbc740] flex items-center justify-center gap-1 mt-0.5">{Number(target.floor_price_gram || target.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" /></span>
                  </>
                ) : (
                  <div className="text-[10px] text-white/40 text-center">Выберите предмет ниже</div>
                )}
             </div>
          </div>
        </div>

        {/* Upgrade Button */}
        <div className="px-4 mb-6">
          <button 
            onClick={handleUpgrade}
            disabled={!canUpgrade}
            className="w-full py-4 rounded-[20px] font-display font-bold text-[18px] flex items-center justify-center gap-2 tracking-wide transition-all bg-[#fbc740] text-black hover:bg-[#fbc740]/90 disabled:opacity-30 disabled:shadow-none shadow-[0_0_30px_rgba(251,199,64,0.3)] uppercase"
          >
            ⬆ Апгрейд
          </button>
        </div>

        {/* Bottom Section: Inventory & Targets */}
        <div className="flex-1 bg-[#121316] rounded-t-[32px] pt-4 px-4 border-t border-white/5 flex flex-col min-h-[400px]">
          {/* Tabs */}
          <div className="flex bg-[#1a1b1f] rounded-[14px] p-1 mb-4 shrink-0">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={\`flex-1 py-2 rounded-[10px] text-[13px] font-bold transition-all \${activeTab === 'inventory' ? 'bg-[#2a2c33] text-white shadow-sm' : 'text-white/40'}\`}
            >
              Мои предметы
            </button>
            <button 
              onClick={() => setActiveTab('targets')}
              className={\`flex-1 py-2 rounded-[10px] text-[13px] font-bold transition-all \${activeTab === 'targets' ? 'bg-[#2a2c33] text-white shadow-sm' : 'text-white/40'}\`}
            >
              Желаемые товары
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                type="text" 
                placeholder="Поиск предмета..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1b1f] border border-white/5 rounded-[12px] py-2 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/30"
              />
            </div>
            <button 
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="bg-[#1a1b1f] border border-white/5 rounded-[12px] px-3 py-2 text-[13px] font-medium text-white flex items-center gap-1"
            >
              Цена {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
            {activeTab === 'inventory' ? (
              filteredInventory.length === 0 ? (
                 <p className="text-white/40 text-[13px] text-center mt-6">Нет доступных предметов</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredInventory.map(item => {
                    const isSelected = sourceIds.includes(item.uniqueId);
                    return (
                      <button
                        key={item.uniqueId}
                        onClick={() => {
                          if (isSelected) setSourceIds(prev => prev.filter(id => id !== item.uniqueId));
                          else setSourceIds(prev => [...prev, item.uniqueId]);
                        }}
                        className={\`relative overflow-hidden w-full aspect-[3/4] rounded-[16px] border flex flex-col items-center p-2 transition-all \${
                          isSelected ? 'border-[#fbc740] bg-[#fbc740]/10 scale-95 shadow-[0_4px_15px_rgba(251,199,64,0.15)]' : 'border-white/5 bg-[#181a20] hover:bg-[#1f2129]'
                        }\`}
                      >
                        <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-1">
                          <PremiumImage staticMode src={item.image_url} alt={item.name} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                        </div>
                        <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0">
                          <span className="text-[10px] text-white/90 truncate w-[95%] text-center leading-none mb-1.5">{item.name}</span>
                          <span className="text-[12px] font-bold text-white flex items-center gap-1">{Number(item.floor_price_gram || item.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" /></span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              (!sourceIds.length && gramBet <= 0) ? (
                 <p className="text-white/40 text-[13px] text-center mt-6">Сначала выберите ставку</p>
              ) : filteredTargets.length === 0 ? (
                 <p className="text-white/40 text-[13px] text-center mt-6">Нет подходящих предметов</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredTargets.map(g => {
                    const isSelected = targetId === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setTargetId(isSelected ? null : g.id)}
                        className={\`relative overflow-hidden w-full aspect-square rounded-[16px] border flex flex-col items-center justify-end pb-2 transition-all \${
                          isSelected ? 'border-[#fbc740] bg-[#fbc740]/10 scale-95 shadow-[0_4px_15px_rgba(251,199,64,0.15)]' : 'border-white/5 bg-[#181a20] hover:bg-[#1f2129]'
                        }\`}
                      >
                        <div className="absolute inset-0 z-0 p-3 pb-8">
                          <PremiumImage staticMode src={g.image_url} alt={g.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="relative z-20 w-full flex flex-col items-center justify-end">
                          <span className="text-[10px] text-white/90 truncate w-[90%] text-center leading-none mb-1">{g.name}</span>
                          <span className="text-[12px] font-bold text-[#fbc740] flex items-center gap-1">{Number(g.floor_price_gram || g.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" /></span>
                        </div>
                      </button>
                    )
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
                <h3 className="font-display text-xl font-bold">Настройки апгрейда</h3>
                <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Multipliers */}
                <div className="space-y-3">
                  <span className="text-[13px] text-white/50 font-bold uppercase tracking-wider">Быстрый множитель</span>
                  <div className="flex items-center gap-2">
                    {[2, 4, 8].map(m => (
                      <button key={m} onClick={() => setMultiplierTarget(m)} className="flex-1 py-3 rounded-[12px] bg-[#1a1b1f] border border-white/5 text-[15px] font-bold text-white hover:bg-white/10 transition-colors">x{m}</button>
                    ))}
                    <button onClick={() => setTargetId(null)} className="w-[50px] h-[50px] shrink-0 rounded-[12px] bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 transition-colors">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-white/30">Множитель автоматически подберет желаемый предмет.</p>
                </div>

                {/* Speed */}
                <div className="space-y-3">
                  <span className="text-[13px] text-white/50 font-bold uppercase tracking-wider">Скорость анимации</span>
                  <div className="flex bg-[#1a1b1f] rounded-[14px] p-1">
                    <button onClick={() => setAnimSpeed('normal')} className={\`flex-1 py-3 rounded-[10px] text-[14px] font-bold transition-all \${animSpeed === 'normal' ? 'bg-[#2a2c33] text-white shadow-sm' : 'text-white/40'}\`}>Нормальная</button>
                    <button onClick={() => setAnimSpeed('fast')} className={\`flex-1 py-3 rounded-[10px] text-[14px] font-bold transition-all \${animSpeed === 'fast' ? 'bg-[#2a2c33] text-white shadow-sm' : 'text-white/40'}\`}>Быстрая</button>
                  </div>
                </div>

                {/* Sound */}
                <div className="space-y-3">
                  <span className="text-[13px] text-white/50 font-bold uppercase tracking-wider">Звук в апгрейде</span>
                  <div className="flex bg-[#1a1b1f] rounded-[14px] p-1">
                    <button onClick={() => setSoundEnabled(true)} className={\`flex-1 py-3 rounded-[10px] text-[14px] font-bold transition-all flex items-center justify-center gap-2 \${soundEnabled ? 'bg-[#2a2c33] text-white shadow-sm' : 'text-white/40'}\`}><Volume2 className="w-4 h-4" /> Включено</button>
                    <button onClick={() => setSoundEnabled(false)} className={\`flex-1 py-3 rounded-[10px] text-[14px] font-bold transition-all flex items-center justify-center gap-2 \${!soundEnabled ? 'bg-[#2a2c33] text-white shadow-sm' : 'text-white/40'}\`}><VolumeX className="w-4 h-4" /> Выключено</button>
                  </div>
                </div>

              </div>

              <button onClick={() => setShowSettings(false)} className="mt-8 w-full py-4 rounded-[16px] font-bold text-[15px] bg-[#fbc740] text-black transition-all shadow-[0_0_20px_rgba(251,199,64,0.2)]">
                Сохранить и закрыть
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {result && (
           <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-sm px-6"
             onClick={() => { setResult(null); setSourceIds([]); setTargetId(null); setGramBet(0); }}
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
               onClick={(e) => e.stopPropagation()}
               className={\`w-full max-w-[280px] flex flex-col gap-2.5 mx-auto p-2 rounded-[28px] relative z-10 transition-all duration-300 shadow-2xl \${
                 result?.status === 'win' 
                   ? 'border border-[#3b82f6]/20 bg-[#16181d] shadow-[0_4px_20px_-10px_rgba(59,130,246,0.1)]' 
                   : 'bg-[#1c0606] border border-[#3f0d0d] p-8 items-center overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)]'
               }\`}
             >
               {result?.status === 'win' ? (
                 <>
                   <div className="w-full flex justify-center pt-2 relative">
                     <div className="flex flex-col items-center">
                       <span className="text-[13px] font-black text-[#22c55e] uppercase tracking-widest">Апгрейд успешен!</span>
                     </div>
                     <button onClick={() => { setResult(null); setSourceIds([]); setTargetId(null); setGramBet(0); }} className="absolute top-0 right-1 p-1 text-white/40 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                   </div>
                   <div className="relative overflow-hidden w-full aspect-square rounded-[20px] flex flex-col items-center p-1 transition-all duration-300">
                     <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-2">
                       <PremiumImage 
                         staticMode={false} 
                         loopWithDelay={true} 
                         loopDelayMs={5000} 
                         src={result.item?.image_url || \`/nft/\${result.item?.name}.png\`} 
                         alt={result.item?.name} 
                         className="w-[85%] h-[85%] object-contain drop-shadow-lg" 
                       />
                     </div>
                     <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0 pb-1.5 px-1">
                       <span className="text-[14px] text-white/90 w-full text-center font-bold leading-tight line-clamp-2">{result.item?.name}</span>
                       <span className="text-[15px] font-bold text-[#fbc740] flex items-center justify-center gap-1 mt-1">{Number(result.item?.price || 0).toFixed(2)} <GramIcon className="w-4 h-4" /></span>
                     </div>
                   </div>
                   
                   <div className="flex flex-col gap-1.5 w-full mt-1">
                     <button 
                       onClick={() => { setResult(null); setSourceIds([]); setTargetId(null); setGramBet(0); }}
                       className="w-full py-3 rounded-[12px] text-[13px] font-bold flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
                     >
                       Отлично
                     </button>
                   </div>
                 </>
               ) : (
                 <>
                   <button onClick={() => { setResult(null); setSourceIds([]); setTargetId(null); setGramBet(0); }} className="absolute top-4 right-4 text-white/40 hover:text-white z-10 transition-colors"><X className="w-5 h-5" /></button>
                   
                   <div className="z-10 relative mt-4">
                     <div className="w-[100px] h-[100px] flex items-center justify-center text-red-500 bg-red-500/10 rounded-full mx-auto">
                       <X className="w-12 h-12" />
                     </div>
                   </div>
     
                   <h3 className="font-display text-[20px] font-bold z-10 tracking-tight text-white mt-4 text-center">Апгрейд не удался</h3>
                   <p className="text-white/60 text-[13px] text-center z-10 font-medium leading-relaxed px-2 mt-1 mb-4">
                     Предметы сгорели. Попробуйте еще раз!
                   </p>
                   
                   <button
                     onClick={() => { setResult(null); setSourceIds([]); setTargetId(null); setGramBet(0); }}
                     className="mt-2 w-full py-3.5 rounded-[12px] font-bold text-[14px] uppercase tracking-wider z-10 transition-colors bg-white/10 text-white hover:bg-white/20"
                   >
                     Продолжить
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
`;

fs.writeFileSync('src/components/Upgrade.tsx', content);
console.log('Done replacing Upgrade.tsx');
