import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../lib/i18n';
import { Box, Lock, ChevronLeft, AlertCircle } from 'lucide-react';
import { fetchCases, CaseConfig, CaseItemConfig } from '../lib/api';
import { incrementStat, recordGameProgress } from '../lib/stats';
import { LiveFeed } from './LiveFeed';
import { PremiumImage } from './PremiumNftImage';
import { GramIcon } from './GramIcon';
import { motion, AnimatePresence } from 'motion/react';
import { CASE_REEL_LENGTH, CASE_REEL_START, CASE_REEL_WINNER, CASE_SPIN_MS, caseReelOffset } from '../lib/caseRoulette';
import { prefersReducedMotion } from '../lib/motion';
import { LiquidSegment } from './ui/LiquidSegment';
import { getRarityConfig, getNftBackdrop } from '../lib/nftUtils';

interface CasesProps {
  balance: number;
  setBalance: any;
  inventory: any[];
  setInventory: (inv: any[]) => void;
  giftsDb: any[];
  onAddTurnover: (amount: number) => void;
  turnover: number;
  hideLiveFeed?: boolean;
}

export function Cases({ balance, setBalance, inventory, setInventory, giftsDb, onAddTurnover, turnover, hideLiveFeed }: CasesProps) {
  const { t } = useTranslation();
  const [cases, setCases] = useState<CaseConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCase, setSelectedCase] = useState<CaseConfig | null>(null);
  const [openAmount, setOpenAmount] = useState(1);
  const [isOpening, setIsOpening] = useState(false);
  const [spinStarted, setSpinStarted] = useState(false);
  const openingRef = useRef(false);
  const frameRef = useRef(0);
  const completionRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current);
    clearTimeout(completionRef.current);
  }, []);
  const [rouletteLines, setRouletteLines] = useState<any[][]>([]);
  const [rouletteOffsets, setRouletteOffsets] = useState<number[]>([]);
  useEffect(() => {
    if (selectedCase) {
      const initialLines = Array.from({ length: 3 }).map(() => 
        Array.from({ length: CASE_REEL_LENGTH }).map(() => selectedCase.items[Math.floor(Math.random() * selectedCase.items.length)])
      );
      setRouletteLines(initialLines);
      setRouletteOffsets(Array.from({ length: 3 }).map(() => 0));
      setResults(null);
      setShowSellConfirm(false);
      setOpenAmount(1);
    }
  }, [selectedCase]);
  const [showSellConfirm, setShowSellConfirm] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [isFastOpen, setIsFastOpen] = useState(false);

  useEffect(() => {
    if (!selectedCase) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [selectedCase]);

  useEffect(() => {
    fetchCases().then(data => {
      setCases(data);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  
  const sellAll = () => {
    if (!results || results.length === 0) return;
    
    const totalGrams = Number((results.reduce((sum, r) => sum + (Number(r.floor_price_gram) || Number(r.price) || 0), 0)).toFixed(2));
    
    // The items were added at the end of the inventory in openCases
    
    // Remove exactly the won NFTs by uniqueId (not a blind tail-slice, which
    // could delete unrelated items if inventory changed meanwhile).
    const nfts = results.filter(r => !r.isGram);
    const wonIds = new Set(nfts.map((r) => r.uniqueId));
    const revertedInventory = inventory.filter((i) => !wonIds.has(i.uniqueId));
    const newBalance = balance + totalGrams;

    
    setBalance(newBalance);
    setInventory(revertedInventory);
    setResults(null);
    setShowSellConfirm(false);
    
    fetch('/api/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}`
      },
      body: JSON.stringify({
        balance: newBalance,
        inventory: revertedInventory,
        turnover
      })
    }).catch(()=> {});
  };

  const openCases = async () => {
    if (!selectedCase || openingRef.current || !selectedCase.items.length) return;
    const totalCost = selectedCase.price * openAmount;
    if (balance < totalCost) return;

    openingRef.current = true;
    setSpinStarted(false);
    setIsOpening(true);
    setResults(null);
    setBalance(balance - totalCost);
    onAddTurnover(totalCost);
    incrementStat('stat_cases_opened', openAmount);

    // Pick items based on chance
    const pickedItems: any[] = [];
    const newInventory = [...inventory];
    const newLines: any[][] = [];
    const newOffsets: number[] = [];
    let totalGramsWon = 0;
    
    for (let i = 0; i < openAmount; i++) {
      let rand = Math.random() * 100;
      let currentChance = 0;
      let selectedItemConfig: CaseItemConfig | null = null;
      
      // Sort items randomly to shuffle if chances sum < 100, wait, normally chances should sum to 100.
      // We do cumulative chance.
      for (const item of selectedCase.items) {
        currentChance += item.chance;
        if (rand <= currentChance) {
          selectedItemConfig = item;
          break;
        }
      }
      
      // If nothing selected (e.g. chances sum to < 100), pick the last one or something.
      if (!selectedItemConfig && selectedCase.items.length > 0) {
        selectedItemConfig = selectedCase.items[selectedCase.items.length - 1];
      }

      if (selectedItemConfig) {
        let winValue = 0;
        
        let gift: any = null;
        if (selectedItemConfig!.giftId.startsWith('gram_')) {
          const amount = Number(selectedItemConfig!.giftId.replace('gram_', ''));
          gift = {
            id: selectedItemConfig!.giftId,
            name: amount + ' GRAM',
            price: amount,
            floor_price_gram: amount,
            isGram: true,
            image_url: '/gram.webp'
          };
          winValue = amount;
        } else {
          gift = giftsDb.find(g => g.id === selectedItemConfig!.giftId);
          if (gift) winValue = Number(gift.floor_price_gram || gift.price || 0);
        }
        
        const multiplier = selectedCase.price > 0 ? (winValue / selectedCase.price) : 0;
        recordGameProgress('cases', selectedCase.price, multiplier, 1);

        
        // Generate line
        const line = Array.from({ length: CASE_REEL_LENGTH }).map((_, idx) => {
          if (idx === CASE_REEL_WINNER) return selectedItemConfig;
          // Keep the visible starting cards, so clicking Open doesn't flash a new reel.
          if (Math.abs(idx - CASE_REEL_START) <= 3 && rouletteLines[i]?.[idx]) return rouletteLines[i][idx];
          return selectedCase.items[Math.floor(Math.random() * selectedCase.items.length)];
        });
        newLines.push(line);
        newOffsets.push(Math.random() * 60 - 30);

        if (gift) {
          
          const itemBackdrop = gift.backdrop || (gift.id?.endsWith('_onyx') || gift.name?.includes('Onyx') ? 'Onyx Black' : gift.id?.endsWith('_black') || gift.name?.includes('(Black)') ? 'Black' : 'Default');
          const giftVal = Number(gift.floor_price_gram || gift.price || 0);
          const invItem = {
            ...gift,
            uniqueId: Date.now().toString() + Math.random().toString(),
            acquiredAt: new Date().toISOString(),
            backdrop: itemBackdrop,
            price: giftVal,
            floor_price_gram: giftVal,
            rarity: gift.rarity
          };
          if (!gift.isGram) {
            newInventory.push(invItem);
          } else {
            totalGramsWon += gift.price;
          }
          pickedItems.push(invItem); // keep in results for display

          
          // API request for live feed
          fetch('/api/opens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}`
            },
            body: JSON.stringify({
              gift: {
                id: gift.id,
                name: gift.name,
                pattern: gift.pattern,
                image_url: gift.image_url,
                lottieUrl: gift.lottieUrl,
                isGram: gift.isGram,
                backdrop: itemBackdrop,
                rarity: gift.rarity,
                floor_price_gram: giftVal,
                price: giftVal
              },
              price: gift.isGram ? gift.price : giftVal,
              isGram: !!gift.isGram,
              multiplier: 1,
              game: 'cases'
            })
          }).catch(()=> {});
        }
      }
    }

    setRouletteLines(newLines);
    setRouletteOffsets(newOffsets);
    
    // Save state
    fetch('/api/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}`
      },
      body: JSON.stringify({
        balance: balance - totalCost + totalGramsWon,
        inventory: newInventory,
        turnover: turnover + totalCost
      })
    }).catch(()=> {});

    // Fake delay for animation
    const completeOpen = () => {
      openingRef.current = false;
      setSpinStarted(false);
      setIsOpening(false);
      setResults(pickedItems);
      setInventory(newInventory);
      if (totalGramsWon > 0) setBalance((prev: number) => prev + totalGramsWon);
    };
    if (isFastOpen || prefersReducedMotion()) {
      completeOpen();
    } else {
      // Paint the populated reel at its middle before starting the transition.
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => {
          setSpinStarted(true);
          completionRef.current = setTimeout(completeOpen, CASE_SPIN_MS + 100);
        });
      });
    }
  };

  if (selectedCase) {
    const casePage = (
      <div className="fixed inset-0 z-[210] flex justify-center bg-[#09090b]/98 backdrop-blur-2xl">
      <div className="relative w-full max-w-md h-full overflow-y-auto overscroll-contain px-4 pt-4 pb-12 space-y-4">
        <button
          disabled={isOpening}
          onClick={() => { setSelectedCase(null); }}
          className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.10] flex items-center justify-center text-white/90 hover:text-white transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mb-2 shadow-sm"
          title={t("back")}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        
        {/* Roulette Area */}
        <div className="premium-card rounded-[24px] p-6 relative overflow-hidden flex flex-col items-center min-h-[300px] border border-white/[0.08]">
          <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">{selectedCase.name}</h2>
          
          {results ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <h3 className="text-xl font-bold text-white mb-4">{t("you_received")}</h3>
              <div className="flex flex-wrap gap-4 justify-center">
                {results.map((r, i) => {
                  const isOnyx = r.backdrop === 'Onyx Black';
                  const isBlack = r.backdrop === 'Black';
                  const rarityConfig = getRarityConfig(r);
                  return (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.08, type: 'spring', damping: 25, stiffness: 350 }}
                      key={i}
                      className={`w-32 h-auto rounded-2xl flex flex-col items-center justify-center p-3 relative border ${
                        isOnyx
                          ? 'bg-gradient-to-b from-[#1f1913] to-[#121214] border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                          : isBlack
                          ? 'bg-gradient-to-b from-[#18181b] to-[#101012] border-zinc-700 shadow-md'
                          : rarityConfig
                          ? rarityConfig.cardBg
                          : 'bg-[#18181b] border-white/[0.08]'
                      }`}
                    >
                      {isOnyx && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-[#c7c7cc] px-1.5 py-0.5 rounded-full bg-[#35393b]/90 border border-white/20 mb-1">
                          Onyx Black
                        </span>
                      )}
                      {isBlack && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-[#c7c7cc] px-1.5 py-0.5 rounded-full bg-[#18191b]/95 border border-white/15 mb-1">
                          Black
                        </span>
                      )}
                      {!isOnyx && !isBlack && rarityConfig && (
                        <span className={`text-[8px] font-black uppercase tracking-wider text-white px-2 py-0.5 rounded-full mb-1 shadow-sm ${rarityConfig.pillClass}`}>
                          {rarityConfig.label}
                        </span>
                      )}
                      {r.image_url && <PremiumImage src={r.image_url} alt={r.name || ''} staticMode={true} className={`mb-2 ${r.isGram ? "w-[68.57px] h-[68.57px]" : "w-[73.85px] h-[73.85px]"}`} />}
                      <div className="text-sm font-bold text-center text-white line-clamp-1 mb-1">{r.name}</div>
                      <div className="flex items-center justify-center gap-1 bg-black/40 px-2.5 py-1 rounded-full text-brand font-bold text-xs border border-white/[0.06]">
                        {Number(r.floor_price_gram || r.price || 0).toFixed(2)} <GramIcon className="scale-[0.7143] w-3 h-3" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-sm">
                <button onClick={() => {
                  setResults(null);
                  if (selectedCase) {
                    setRouletteOffsets(Array.from({ length: 3 }).map(() => 0));
                    setRouletteLines(Array.from({ length: 3 }).map(() => 
                      Array.from({ length: CASE_REEL_LENGTH }).map(() => selectedCase.items[Math.floor(Math.random() * selectedCase.items.length)])
                    ));
                  }
                }} className="flex-1 px-4 py-3.5 bg-white/[0.08] hover:bg-white/[0.12] rounded-full font-bold text-white border border-white/[0.08] transition-all cursor-pointer">{t("continue")}</button>
                <button onClick={() => setShowSellConfirm(true)} className="flex-1 px-4 py-3.5 primary-button text-white rounded-full font-bold transition-all cursor-pointer">{t("sell_all")}</button>
              </div>
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center space-y-4 w-full">
               {Array.from({ length: openAmount }).map((_, lineIdx) => (
                 <div key={lineIdx} className="w-full h-32 sm:h-40 bg-black/50 border border-white/[0.06] rounded-2xl relative overflow-hidden flex items-center shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
                   <div className="pointer-events-none absolute w-0.5 h-full bg-brand/80 left-1/2 transform -translate-x-1/2 z-20 shadow-[0_0_10px_rgba(0,152,234,0.4)]"></div>
                   <div 
                     className="absolute left-1/2 flex gap-4 will-change-transform"
                     style={{
                       transform: `translateX(${caseReelOffset(spinStarted ? CASE_REEL_WINNER : CASE_REEL_START, spinStarted ? rouletteOffsets[lineIdx] || 0 : 0)}px)`,
                       transition: spinStarted ? `transform ${CASE_SPIN_MS}ms cubic-bezier(0.15, 1, 0.3, 1)` : 'none'
                     }}
                   >
                     {(rouletteLines[lineIdx] || []).map((itemConfig, i) => {
                       
                       let g: any = null;
                       if (itemConfig?.giftId?.startsWith('gram_')) {
                         const amount = Number(itemConfig.giftId.replace('gram_', ''));
                         g = {
                           id: itemConfig.giftId,
                           name: amount + ' GRAM',
                           price: amount,
                           floor_price_gram: amount,
                           image_url: '/gram.webp',
                           isGram: true
                         };
                       } else {
                         g = giftsDb.find(x => x.id === itemConfig?.giftId);
                       }

                       const backdrop = g ? getNftBackdrop(g) : 'Default';
                       const isOnyx = backdrop === 'Onyx Black';
                       const isBlack = backdrop === 'Black';
                       const rarityConfig = getRarityConfig(g);

                       return (
                         <div key={i} className={`w-24 h-24 sm:w-24 sm:h-24 shrink-0 rounded-2xl flex items-center justify-center p-2 transform-gpu shadow-sm relative overflow-hidden border ${
                           isOnyx
                             ? 'bg-[radial-gradient(circle_at_top,#3f3f46_0%,#18181b_100%)] border-amber-500/30'
                             : isBlack
                             ? 'bg-[radial-gradient(circle_at_top,#27272a_0%,#121214_100%)] border-zinc-700/60'
                             : rarityConfig
                             ? rarityConfig.liveFeedBg
                             : 'bg-[#18181b] border-white/[0.08]'
                         }`}>
                           {g?.image_url ? (
                             <PremiumImage src={g.image_url} alt={g.name || ''} className={g.isGram ? "w-[71.43%] h-[71.43%]" : "w-[76.92%] h-[76.92%]"} staticMode={true} />
                           ) : <Box className="w-8 h-8 text-white/30" />}
                         </div>
                       );
                     })}
                   </div>
                 </div>
               ))}
               
               {isOpening ? (
                 <div className="text-brand font-bold animate-pulse mt-4">{t("opening")}</div>
               ) : (
                 <div className="w-full mt-4 flex flex-col items-center">
                   <div className="flex items-center justify-center mb-4">
                     <button onClick={() => setIsFastOpen(!isFastOpen)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${isFastOpen ? "bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white shadow-[0_0_14px_rgba(0,152,234,0.45),inset_0_1px_0_rgba(255,255,255,0.3)] border border-cyan-300/40" : "bg-white/[0.08] border border-white/[0.08] text-white/80"}`}>{isFastOpen ? t('fast_open_on') : t('fast_open_off')}</button>
                   </div>
                   <LiquidSegment
                     className="w-full max-w-[240px] mb-6"
                     ariaLabel={t('cases_open_count')}
                     value={String(openAmount) as '1' | '2' | '3'}
                     onChange={(value) => setOpenAmount(Number(value))}
                     options={[
                       { value: '1', label: 'x1' },
                       { value: '2', label: 'x2' },
                       { value: '3', label: 'x3' },
                     ]}
                   />
                   <button 
                     onClick={openCases}
                     disabled={balance < selectedCase.price * openAmount}
                     className="w-full max-w-sm py-4 primary-button rounded-2xl text-white font-display font-bold text-[17px] disabled:opacity-40 disabled:cursor-not-allowed transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                   >
                     {t("open_for")} {(selectedCase.price * openAmount).toFixed(2)} <GramIcon className="scale-[0.7143] w-5 h-5" />
                   </button>
                 </div>
               )}
             </div>
          )}
        </div>
        
        {/* Sell Confirm Modal */}
        {showSellConfirm && results && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#18181b] border border-white/[0.10] rounded-[24px] p-6 max-w-sm w-full relative shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-3 text-brand mb-4">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-bold text-white tracking-tight">{t("sell_all_question")}</h3>
              </div>
              <p className="text-white/70 mb-6 text-sm leading-relaxed">
                {t("sell_all_desc")} {results.length} {t("items_for")} <strong className="text-brand">{Number((results.reduce((sum, r) => sum + (Number(r.floor_price_gram) || Number(r.price) || 0), 0)).toFixed(2))} GRAM</strong>? {t("items_will_be_removed")}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSellConfirm(false)} className="flex-1 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] font-bold text-white transition-transform cursor-pointer">{t("cancel")}</button>
                <button onClick={sellAll} className="flex-1 py-3.5 rounded-xl primary-button font-bold text-white transition-transform cursor-pointer">{t("sell")}</button>
              </div>
            </div>
          </div>
        )}

        {/* Case Contents List */}
        {!results && (
          <div className="mt-8 mb-4">
            <h3 className="font-bold text-white/70 text-lg mb-4 text-center">{t("case_contents")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {[...selectedCase.items].sort((a, b) => {
                const getPrice = (itemConfig: any) => {
                  if (itemConfig.giftId.startsWith('gram_')) return Number(itemConfig.giftId.replace('gram_', ''));
                  const gift = giftsDb.find(x => x.id === itemConfig.giftId);
                  return gift ? (Number(gift.floor_price_gram) || Number(gift.price) || 0) : 0;
                };
                return getPrice(b) - getPrice(a);
              }).map((itemConfig, idx) => {
                
                let g: any = null;
                if (itemConfig?.giftId?.startsWith('gram_')) {
                  const amount = Number(itemConfig.giftId.replace('gram_', ''));
                  g = {
                    id: itemConfig.giftId,
                    name: amount + ' GRAM',
                    price: amount,
                    image_url: '/gram.webp',
                    isGram: true
                  };
                } else {
                  g = giftsDb.find(x => x.id === itemConfig.giftId);
                }
                if (!g) return null;

                const backdrop = g ? getNftBackdrop(g) : 'Default';
                const isOnyx = backdrop === 'Onyx Black';
                const isBlack = backdrop === 'Black';
                const rarityConfig = getRarityConfig(g);

                return (
                  <div key={idx} className={`rounded-2xl flex flex-col items-center justify-center p-3 relative h-full border ${
                    isOnyx
                      ? 'bg-gradient-to-b from-[#1f1913] to-[#121214] border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : isBlack
                      ? 'bg-gradient-to-b from-[#18181b] to-[#101012] border-zinc-700 shadow-md'
                      : rarityConfig
                      ? rarityConfig.cardBg
                      : 'bg-[#18181b] border-white/[0.08]'
                  }`}>
                    {isOnyx && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#c7c7cc] px-1.5 py-0.5 rounded-full bg-[#35393b]/90 border border-white/20 mb-1">
                        Onyx Black
                      </span>
                    )}
                    {isBlack && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#c7c7cc] px-1.5 py-0.5 rounded-full bg-[#18191b]/95 border border-white/15 mb-1">
                        Black
                      </span>
                    )}
                    {!isOnyx && !isBlack && rarityConfig && (
                      <span className={`text-[8px] font-black uppercase tracking-wider text-white px-2 py-0.5 rounded-full mb-1 shadow-sm ${rarityConfig.pillClass}`}>
                        {rarityConfig.label}
                      </span>
                    )}
                    <div className="w-full flex items-center justify-center h-28 mb-3">
                      <PremiumImage src={g.image_url} alt={g.name || ''} className={g.isGram ? "w-[71.43%] h-[71.43%]" : "w-[76.92%] h-[76.92%]"} staticMode={true} />
                    </div>
                    <div className="text-sm font-bold text-center text-white line-clamp-1 w-full">{g.name}</div>
                    <div className="flex items-center gap-1 mt-1.5 bg-black/40 px-2.5 py-1 rounded-full text-brand text-xs font-bold border border-white/[0.06]">
                      {Number(g.floor_price_gram || g.price || 0).toFixed(2)} <GramIcon className="scale-[0.7143] w-3 h-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(casePage, document.body) : casePage;
  }
  return (
    <div className="space-y-6 pt-2 pb-10">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Box className="w-7 h-7 text-brand" />
          <h2 className="font-display text-2xl font-semibold">{t('nav_cases')}</h2>
        </div>
      </div>

      {!hideLiveFeed && (
        <div className="mb-6 -mx-5 px-5">
          <LiveFeed />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-56 rounded-[22px]" />
          <div className="skeleton h-56 rounded-[22px]" />
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center text-white/50 py-10 bg-white/5 rounded-2xl border border-white/10">{t("no_cases")}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {cases.map(c => (
            <div 
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className="premium-card rounded-[22px] flex flex-col cursor-pointer group overflow-hidden transition-all"
            >
              <div className="flex-1 w-full relative h-[160px] flex items-center justify-center p-4">
                {c.image ? (
                  <PremiumImage src={c.image} alt={c.name} staticMode={true} className="w-[76.92%] h-[76.92%] object-contain group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <Box className="w-12 h-12 text-white/20" />
                )}
              </div>
              
              <div className="bg-[#18181b]/90 border-t border-white/[0.06] p-3 flex flex-col gap-2 w-full">
                <div className="font-bold text-white text-[15px] leading-tight text-center whitespace-normal break-words">{c.name}</div>
                <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 w-full py-1.5 rounded-xl font-bold text-white shadow-sm shrink-0">
                  <span>{Number(c.price)}</span>
                  <GramIcon className="scale-[0.7143] w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
