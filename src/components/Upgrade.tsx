import { useTranslation } from '../lib/i18n';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, X, Plus, Coins, Trash2, TrendingUp, Shuffle, Bomb } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { PremiumImage } from './PremiumImage';
import { incrementStat, recordGameProgress } from '../lib/stats';
import { GramIcon } from './GramIcon';

export function Upgrade({ inventory, giftsDb, onBack, balance, setBalance, onWin, setInventory, onBet, onNavigate }: { inventory: any[], giftsDb: any[], onBack: () => void, balance: number, setBalance: any, onWin?: (item: any, price: number) => void, setInventory: any, onBet?: (amount: number) => void, onNavigate?: (target: string) => void }) {
  const { t } = useTranslation();
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [gramBetInput, setGramBetInput] = useState('');
  const gramBet = parseFloat(gramBetInput) || 0;
  const setGramBet = (val: any) => { if (typeof val === 'function') { setGramBetInput(prev => val(parseFloat(prev) || 0).toString()); } else { setGramBetInput(val.toString()); } };
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{status: 'win' | 'lose', item?: any} | null>(null);
  const [rotation, setRotation] = useState(0);

  const pendingResultRef = useRef<any>(null);

  const [showSourceSelect, setShowSourceSelect] = useState(false);
  const [showTargetSelect, setShowTargetSelect] = useState(false);

  useEffect(() => {
    return () => {
      if (pendingResultRef.current) {
        applyResultRef.current(pendingResultRef.current);
      }
    };
  }, []);

  const applyResultRef = useRef((resultData: any) => {});
  applyResultRef.current = (resultData: any) => {
    const { isWin, wonItem, gramBetDeducted, removedSourceId, multiplier } = resultData;
    if (isWin) {
      incrementStat('stat_upgrade_wins');
      recordGameProgress('upgrade', gramBetDeducted, multiplier, 1);
      setInventory((prev: any[]) => [wonItem, ...prev.filter(i => i.uniqueId !== removedSourceId)]);
      onWin?.({ name: wonItem.name, image_url: wonItem.image_url, slug: wonItem.slug }, wonItem.price);
    } else {
      setInventory((prev: any[]) => prev.filter(i => i.uniqueId !== removedSourceId));
    }
  };
  const availableInventory = inventory.filter(i => !i.isWithdrawing);

  const controls = useAnimation();

  const source = useMemo(() => availableInventory.find((i) => i.uniqueId === sourceId), [availableInventory, sourceId]);
  
  const sourcePrice = source ? (source.floor_price_gram || source.price || 0) : 0;
  const totalBet = sourcePrice + gramBet;

  const targets = useMemo(() => {
    return [...giftsDb]
      .filter((g) => g.floor_price_gram > totalBet)
      .sort((a, b) => a.floor_price_gram - b.floor_price_gram);
  }, [giftsDb, totalBet]);

  const target = useMemo(() => targets.find((t) => t.id === targetId), [targets, targetId]);

  // Auto-deselect target if it becomes invalid due to gram bet increase
  useEffect(() => {
    if (target && target.floor_price_gram <= totalBet) {
      setTargetId(null);
    }
  }, [totalBet, target]);

  let chance = target ? (totalBet / target.floor_price_gram) * 100 : 0;
  if (chance > 95) chance = 95;

  const canUpgrade = (source || gramBet >= 0.1) && target && balance >= gramBet && chance > 0 && !spinning && (gramBet === 0 || gramBet >= 0.1);
  
  const multiplier = totalBet > 0 && target ? target.floor_price_gram / totalBet : 0;

  const handleUpgrade = async () => {
    if (!canUpgrade) return;

    if (gramBet > 0) {
      setBalance((b: number) => b - gramBet);
    }
    if (onBet && totalBet > 0) {
      onBet(totalBet);
    }

    const win = Math.random() * 100 < chance;
    
    // Animate wheel
    const winAngle = (chance / 100) * 360;
    let finalAngle;
    if (win) {
       // Random angle in green zone
       const rand = Math.random() * winAngle;
       finalAngle = 360 - rand;
    } else {
       // Random angle in red zone
       const rand = winAngle + Math.random() * (360 - winAngle);
       finalAngle = 360 - rand;
    }
    
    const currentMod = rotation % 360;
    const diff = finalAngle - currentMod;
    
    const targetRotation = rotation + (360 * 6) + diff; 
    
    let finalWonItem = null;
    if (win) {
      finalWonItem = { ...target, uniqueId: Date.now().toString(), price: target.floor_price_gram, image_url: target.image_url };
    }

    pendingResultRef.current = {
      isWin: win,
      wonItem: finalWonItem,
      gramBetDeducted: gramBet,
      removedSourceId: source ? source.uniqueId : null,
      multiplier: multiplier
    };

    setSpinning(true);
    await controls.start({
      rotate: targetRotation,
      transition: { duration: 3.5, ease: [0.15, 0.85, 0.35, 1] }
    });
    setRotation(targetRotation);

    if (pendingResultRef.current) {
      applyResultRef.current(pendingResultRef.current);
      pendingResultRef.current = null;
      setResult({ status: win ? 'win' : 'lose', item: win ? finalWonItem : target });
      setSpinning(false);
    }
    
  };

  const addGramBet = (amount: number) => {
    setGramBet((prev: number) => Math.min(balance, prev + amount));
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
        <h1 className="font-display text-lg font-bold text-white drop-shadow-md">{t('upgrade_title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 pt-[72px]">
        {/* Main Upgrade Card */}
        <div className="mx-4 mt-6 bg-[#1a1b1e] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex justify-between items-center shadow-lg">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#4f8eff]/10 blur-[50px] rounded-full pointer-events-none" />
          
          {/* Left: Input */}
          <div className="z-10 flex flex-col items-center justify-start w-[30%] shrink-0 relative pb-2">
            {source ? (
              <div onClick={() => setShowSourceSelect(true)} className="cursor-pointer w-24 h-[120px] sm:w-[104px] sm:h-[136px] rounded-2xl overflow-hidden relative active:scale-95 transition-transform bg-[#25262b] border border-white/10 flex flex-col items-center p-2">
                <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-1 mt-1">
                  <PremiumImage staticMode src={source.image_url} alt={source.name} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                </div>
                <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0">
                  <span className="text-[9px] text-white/90 truncate w-[95%] text-center font-medium leading-tight">{source.name}</span>
                  <span className="text-[11px] font-bold text-white flex items-center justify-center gap-0.5 mt-0.5">{Number(source.floor_price_gram || source.price || 0).toFixed(2)} <GramIcon className="w-2.5 h-2.5" /></span>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowSourceSelect(true)} className="w-24 h-[120px] sm:w-[104px] sm:h-[136px] rounded-2xl bg-[#25262b]/50 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/30 hover:text-white/60 hover:border-white/30 hover:bg-[#25262b] transition-all active:scale-95">
                <Plus className="w-7 h-7" />
              </button>
            )}
            {gramBet > 0 && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#2c2d33] px-2.5 py-1 rounded-full border border-white/10 flex items-center justify-center gap-1 whitespace-nowrap shadow-md w-max z-20">
                <span className="text-[11px] font-bold text-[#fbc740]">+{gramBet.toFixed(1)}</span>
                <GramIcon className="w-3 h-3 text-[#fbc740]" />
              </div>
            )}
          </div>
          
          {/* Center: Wheel */}
          <div className="z-10 relative flex-1 flex justify-center shrink-0">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36">
              <div className="w-full h-full -rotate-90">
                <motion.div className="w-full h-full drop-shadow-xl" animate={controls}>
                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    {/* Background Circle (Red - Lose) */}
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#ef4444" strokeWidth="8" strokeOpacity="0.8" />
                    
                    {/* Foreground Circle (Green - Win) */}
                    <circle 
                      cx="50" cy="50" r="44" fill="none" stroke="#22c55e" strokeWidth="8" 
                      strokeDasharray={`${(chance / 100) * 276.46} 276.46`}
                      strokeLinecap="butt"
                    />
                  </svg>
                </motion.div>
              </div>
              
              {/* Top Pointer */}
              <div className="absolute -top-[23px] left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                <svg width="26" height="30" viewBox="0 0 26 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left Side */}
                  <path d="M13 28 L4 4 L13 9 Z" fill="url(#ptr_left)" />
                  {/* Right Side */}
                  <path d="M13 28 L13 9 L22 4 Z" fill="url(#ptr_right)" />
                  {/* Border */}
                  <path d="M13 28 L4 4 L13 9 L22 4 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="ptr_left" x1="8.5" y1="4" x2="8.5" y2="28" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#ffffff" />
                      <stop offset="1" stopColor="#9ca3af" />
                    </linearGradient>
                    <linearGradient id="ptr_right" x1="17.5" y1="4" x2="17.5" y2="28" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#d1d5db" />
                      <stop offset="1" stopColor="#4b5563" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              
              {/* Inner Circle Content */}
              <div className="absolute inset-2 bg-[#1a1b1e] rounded-full border-4 border-[#25262b] shadow-inner flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">{chance.toFixed(1)}<span className="text-sm text-white/50">%</span></span>
                {multiplier > 0 && <span className="text-[9px] text-white/60 font-semibold tracking-wider uppercase mt-0.5 px-1.5 py-0.5 bg-[#25262b] rounded text-center">x{multiplier.toFixed(2)}</span>}
              </div>
            </div>
          </div>

          {/* Right: Target */}
          <div className="z-10 flex flex-col items-center justify-start w-[30%] shrink-0 relative pb-2">
            {target ? (
              <div onClick={() => setShowTargetSelect(true)} className="cursor-pointer w-24 h-[120px] sm:w-[104px] sm:h-[136px] rounded-2xl overflow-hidden relative active:scale-95 transition-transform bg-[#25262b] border border-[#22c55e]/50 shadow-[0_0_15px_rgba(34,197,94,0.15)] flex flex-col items-center p-2">
                <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-1 mt-1">
                  <PremiumImage staticMode src={target.image_url} alt={target.name} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                </div>
                <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0">
                  <span className="text-[9px] text-white/90 truncate w-[95%] text-center font-medium leading-tight">{target.name}</span>
                  <span className="text-[11px] font-bold text-white flex items-center justify-center gap-0.5 mt-0.5 drop-shadow-sm">{Number(target.floor_price_gram || target.price || 0).toFixed(2)} <GramIcon className="w-2.5 h-2.5" /></span>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowTargetSelect(true)} className="w-24 h-[120px] sm:w-[104px] sm:h-[136px] rounded-2xl bg-[#25262b]/30 border-2 border-dashed border-[#22c55e]/30 flex flex-col items-center justify-center text-[#22c55e]/50 relative overflow-hidden hover:text-[#22c55e]/80 hover:border-[#22c55e]/60 hover:bg-[#25262b]/50 transition-all active:scale-95">
                <Sparkles className="w-7 h-7 mb-1" />
                <span className="text-[9px] font-medium uppercase tracking-wider">{t('choose')}</span>
              </button>
            )}
          </div>
        </div>

        {/* GRAM Bet Redesigned */}
        <div className="mx-4 mt-8 bg-surface border border-hairline rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                <Coins className="w-4 h-4 text-gold" />
              </div>
              <h3 className="text-white/80 font-bold text-[14px] flex items-center gap-1">{t('add_gram')} <GramIcon className="w-4 h-4 drop-shadow-md" /></h3>
            </div>
            <div className="text-right">
              <span className="block text-[10px] text-muted font-medium uppercase tracking-widest">{t('balance')}</span>
              <span className="font-bold text-[14px]">{balance.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
              <span className="text-muted text-[13px] font-bold ml-2">{t('bet')}</span>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={gramBetInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      if (val !== '' && parseFloat(val) > balance) {
                        setGramBetInput(balance.toString());
                      } else {
                        setGramBetInput(val);
                      }
                    }
                  }}
                  placeholder="0.0"
                  className="bg-transparent text-right text-white font-bold text-[18px] w-24 outline-none placeholder:text-white/20"
                  disabled={spinning}
                />
                <span className="text-gold font-bold text-[14px]"><GramIcon className="w-4 h-4 drop-shadow-md" /></span>
              </div>
            </div>
            {gramBet > 0 && (
              <button 
                onClick={() => setGramBet(0)}
                disabled={spinning}
                className="w-12 h-12 shrink-0 bg-danger/10 text-danger hover:bg-danger/20 rounded-2xl flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            {[1, 5, 25, 50].map(amt => (
              <button
                key={amt}
                onClick={() => addGramBet(amt)}
                disabled={spinning || balance < amt}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[13px] font-bold text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100"
              >
                +{amt}
              </button>
            ))}
            <button
              onClick={() => setGramBet(balance)}
              disabled={spinning || balance <= 0}
              className="flex-1 py-2.5 rounded-xl bg-gold/10 border border-gold/20 text-[13px] font-bold text-gold hover:bg-gold/20 active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100"
            >
              MAX
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted text-center mt-6 px-6 pb-2 leading-tight">
          * Note: when withdrawing NFTs, random backgrounds, patterns and models are issued.
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pointer-events-none z-50">
        <button
          onClick={handleUpgrade}
          disabled={!canUpgrade}
          className="pointer-events-auto w-full py-4.5 rounded-full font-black text-[17px] uppercase tracking-wide bg-brand text-black disabled:opacity-40 disabled:bg-white/10 disabled:text-white disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(var(--brand),0.3)] disabled:shadow-none"
        >
          <Sparkles className="w-5 h-5" />
          {spinning ? t('spinning') : t('run_upgrade')}
        </button>
      </div>

      {/* Selectors Modals */}
      <AnimatePresence>
        {showSourceSelect && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSourceSelect(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full bg-surface border-t border-hairline rounded-t-[32px] p-6 pb-12 shadow-2xl z-10 flex flex-col max-h-[70vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-xl font-bold">{t('choose_item')}</h3>
                <button onClick={() => setShowSourceSelect(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto no-scrollbar pb-10">
                {availableInventory.length === 0 ? (
                  <p className="text-muted text-[14px] px-5 bg-white/5 py-4 rounded-2xl text-center border border-white/5 border-dashed">{inventory.length > 0 ? 'All items are currently pending withdrawal.' : t('inventory_empty_upgrade')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {availableInventory.map((item) => (
                      <button
                        key={item.uniqueId || item.id || Math.random()}
                        onClick={() => { setSourceId(item.uniqueId === sourceId ? null : item.uniqueId); setShowSourceSelect(false); }}
                        className={`relative overflow-hidden w-full aspect-[3/4] rounded-[20px] border-2 flex flex-col items-center p-2 transition-all ${
                          sourceId === item.uniqueId ? 'border-brand bg-brand/10 scale-95 shadow-[0_4px_20px_rgba(var(--brand),0.2)]' : 'border-white/5 bg-[#181a20] hover:bg-[#1f2129]'
                        }`}
                      >
                        <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-2">
                          <PremiumImage staticMode src={item.image_url} alt={item.name} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                        </div>
                        <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0">
                          <span className="text-[10px] text-white/90 truncate w-[95%] text-center leading-none mb-1.5 drop-shadow-md">{item.name}</span>
                          <span className="text-[12px] font-bold text-white leading-none drop-shadow-md flex items-center justify-center gap-1">{Number(item.floor_price_gram || item.price || 0).toFixed(2)} <GramIcon className="w-3 h-3 drop-shadow-md" /></span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTargetSelect && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTargetSelect(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full bg-surface border-t border-hairline rounded-t-[32px] p-6 pb-12 shadow-2xl z-10 flex flex-col max-h-[70vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-xl font-bold">{t('target_item')}</h3>
                <button onClick={() => setShowTargetSelect(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto no-scrollbar pb-10">
                {(!source && gramBet <= 0) ? (
                  <p className="text-muted text-[14px] px-5 bg-white/5 py-4 rounded-2xl text-center border border-white/5 border-dashed">{t('choose_item_desc')}</p>
                ) : targets.length === 0 ? (
                  <p className="text-muted text-[14px] px-5 bg-white/5 py-4 rounded-2xl text-center border border-white/5 border-dashed">{t('no_available_items')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {targets.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => { setTargetId(g.id === targetId ? null : g.id); setShowTargetSelect(false); }}
                        className={`relative overflow-hidden w-full aspect-square rounded-[20px] border-2 flex flex-col items-center justify-end pb-2 transition-all ${
                          targetId === g.id ? 'border-brand bg-brand/10 scale-95 shadow-[0_4px_20px_rgba(var(--brand),0.2)]' : 'border-white/5 bg-[#181a20] hover:bg-[#1f2129]'
                        }`}
                      >
                        <div className="absolute inset-0 z-0">
                          <PremiumImage staticMode src={g.image_url} alt={g.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="relative z-20 w-full flex flex-col items-center justify-end">
                          <span className="text-[10px] text-white/90 truncate w-[90%] text-center leading-none mb-1 drop-shadow-md">{g.name}</span>
                          <span className="text-[12px] font-bold text-white leading-none drop-shadow-md flex items-center justify-center gap-1">{Number(g.floor_price_gram || g.price || 0).toFixed(2)} <GramIcon className="w-3 h-3 drop-shadow-md" /></span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
           <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-sm px-6"
             onClick={() => { setResult(null); setSourceId(null); setTargetId(null); setGramBet(0); }}
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
               onClick={(e) => e.stopPropagation()}
               className={`w-full max-w-[280px] flex flex-col gap-2.5 mx-auto p-2 rounded-[28px] relative z-10 transition-all duration-300 shadow-2xl ${
                 result?.status === 'win' 
                   ? 'border border-[#3b82f6]/20 bg-[#16181d] shadow-[0_4px_20px_-10px_rgba(59,130,246,0.1)]' 
                   : 'bg-[#1c0606] border border-[#3f0d0d] p-8 items-center overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)]'
               }`}
             >
               {result?.status === 'win' ? (
                 <>
                   <div className="w-full flex justify-center pt-1 relative">
                     <div className="flex flex-col items-center">
                       <span className="text-[11px] font-bold text-[#3b82f6] uppercase tracking-widest">Random</span>
                       <span className="text-[8px] text-white/20 font-bold tracking-widest uppercase mt-0.5">Platina Gift</span>
                     </div>
                     <button onClick={() => { setResult(null); setSourceId(null); setTargetId(null); setGramBet(0); }} className="absolute top-0 right-1 p-1 text-white/40 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
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
                         onClick={() => { setResult(null); setSourceId(null); setTargetId(null); setGramBet(0); if(onNavigate) onNavigate('upgrade'); }}
                         className="flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#22c55e] text-white hover:bg-[#16a34a] transition-colors"
                       >
                         <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                         <span className="truncate">{t('upgrade')}</span>
                       </button>
                       <button 
                         onClick={() => { setResult(null); setSourceId(null); setTargetId(null); setGramBet(0); if(onNavigate) onNavigate('craft'); }}
                         className="flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-colors"
                       >
                         <Shuffle className="w-3.5 h-3.5 shrink-0" />
                         <span className="truncate">{t('craft')}</span>
                       </button>
                       <button 
                         onClick={() => { setResult(null); setSourceId(null); setTargetId(null); setGramBet(0); if(onNavigate) onNavigate('mines'); }}
                         className="flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 bg-[#a855f7] text-white hover:bg-[#9333ea] transition-colors"
                       >
                         <Bomb className="w-3.5 h-3.5 shrink-0" />
                         <span className="truncate">Mines</span>
                       </button>
                     </div>
                     <button 
                       onClick={() => { setResult(null); setSourceId(null); setTargetId(null); setGramBet(0); if(onNavigate) onNavigate('inventory'); }}
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
                         setResult(null); setSourceId(null); setTargetId(null); setGramBet(0);
                       }}
                       className="w-full py-3 flex items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-bold bg-[#2a2c33] text-white/90 hover:bg-white/10 transition-colors"
                     >
                       {t('sell')} {Number(result.item?.price || 0).toFixed(2)} <GramIcon className="w-4 h-4 opacity-80" />
                     </button>
                   </div>
                 </>
               ) : (
                 <>
                   <button onClick={() => { setResult(null); setSourceId(null); setTargetId(null); setGramBet(0); }} className="absolute top-4 right-4 text-white/40 hover:text-white z-10 transition-colors"><X className="w-5 h-5" /></button>
                   
                   <div className="z-10 relative">
                     <div className="w-[120px] h-[120px] flex items-center justify-center text-danger/80 bg-danger/10 rounded-[28px]">
                       <Trash2 className="w-14 h-14" />
                     </div>
                   </div>
     
                   <h3 className="font-display text-[28px] font-bold z-10 tracking-tight text-white mt-2">{t('burnt')}</h3>
                   <p className="text-white/60 text-[14px] text-center z-10 font-medium leading-relaxed px-2">
                     {t('upgrade_fail_msg')}
                   </p>
                   
                   <button
                     onClick={() => { setResult(null); setSourceId(null); setTargetId(null); setGramBet(0); }}
                     className="mt-4 w-full py-4 rounded-[16px] font-bold text-[15px] uppercase tracking-wider z-10 transition-colors bg-white/10 text-white hover:bg-white/20"
                   >
                     Continue
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
