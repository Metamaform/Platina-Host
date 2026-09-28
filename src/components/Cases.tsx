import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../lib/i18n';
import { Box, Lock, ChevronLeft, AlertCircle } from 'lucide-react';
import { fetchCases, CaseConfig, CaseItemConfig } from '../lib/api';
import { incrementStat, recordGameProgress } from '../lib/stats';
import { LiveFeed } from './LiveFeed';
import { PremiumImage } from './PremiumImage';
import { GramIcon } from './GramIcon';
import { motion, AnimatePresence } from 'motion/react';

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
  const [rouletteLines, setRouletteLines] = useState<any[][]>([]);
  const [rouletteOffsets, setRouletteOffsets] = useState<number[]>([]);
  useEffect(() => {
    if (selectedCase) {
      const initialLines = Array.from({ length: 3 }).map(() => 
        Array.from({ length: 35 }).map(() => selectedCase.items[Math.floor(Math.random() * selectedCase.items.length)])
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
    if (!selectedCase || isOpening) return;
    const totalCost = selectedCase.price * openAmount;
    if (balance < totalCost) return;

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
        const line = Array.from({ length: 35 }).map((_, idx) => {
          if (idx === 28) return selectedItemConfig;
          return selectedCase.items[Math.floor(Math.random() * selectedCase.items.length)];
        });
        newLines.push(line);
        newOffsets.push(Math.random() * 60 - 30);

        if (gift) {
          
          const itemBackdrop = gift.backdrop || (gift.id?.endsWith('_onyx') || gift.name?.includes('Onyx') ? 'Onyx Black' : gift.id?.endsWith('_black') || gift.name?.includes('(Black)') ? 'Black' : 'Default');
          const invItem = {
            ...gift,
            uniqueId: Date.now().toString() + Math.random().toString(),
            acquiredAt: new Date().toISOString(),
            backdrop: itemBackdrop
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
              gift: { id: gift.id, name: gift.name, pattern: gift.pattern, image_url: gift.image_url, lottieUrl: gift.lottieUrl, isGram: gift.isGram, backdrop: itemBackdrop },
              price: selectedCase.price,
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
      setIsOpening(false);
      setResults(pickedItems);
      setInventory(newInventory);
      if (totalGramsWon > 0) setBalance((prev: number) => prev + totalGramsWon);
    };
    if (isFastOpen) {
      completeOpen();
    } else {
      setTimeout(completeOpen, 5500);
    }
  };

  if (selectedCase) {
    return (
      <div className="space-y-4 pt-2 pb-10">
        <button
          onClick={() => { setSelectedCase(null); }}
          className="w-9 h-9 rounded-full bg-white/[0.12] hover:bg-white/[0.20] border border-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer mb-2"
          title={t("back")}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        
        {/* Roulette Area */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col items-center min-h-[300px]">
          <h2 className="text-2xl font-bold text-white mb-4">{selectedCase.name}</h2>
          
          {results ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <h3 className="text-xl font-bold text-white mb-4">{t("you_received")}</h3>
              <div className="flex flex-wrap gap-4 justify-center">
                {results.map((r, i) => {
                  const isOnyx = r.backdrop === 'Onyx Black';
                  const isBlack = r.backdrop === 'Black';
                  return (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      key={i}
                      className={`w-32 h-auto rounded-xl flex flex-col items-center justify-center p-3 relative ${
                        isOnyx
                          ? 'bg-gradient-to-b from-[#1f1913] to-[#121214] border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                          : isBlack
                          ? 'bg-gradient-to-b from-[#18181b] to-[#101012] border border-zinc-700 shadow-md'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      {isOnyx && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-amber-300 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 mb-1">
                          Onyx
                        </span>
                      )}
                      {isBlack && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-300 px-1.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 mb-1">
                          Black
                        </span>
                      )}
                      {r.image_url && <PremiumImage src={r.image_url} alt={r.name || ''} className="w-24 h-24 mb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />}
                      <div className="text-sm font-bold text-center text-white line-clamp-1 mb-1">{r.name}</div>
                      <div className="flex items-center justify-center gap-1 bg-black/40 px-2 py-0.5 rounded text-brand font-bold text-sm">
                        {Number(r.floor_price_gram || r.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" />
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
                      Array.from({ length: 35 }).map(() => selectedCase.items[Math.floor(Math.random() * selectedCase.items.length)])
                    ));
                  }
                }} className="flex-1 px-4 py-3 bg-white/[0.14] hover:bg-white/[0.22] border border-white/[0.18] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-full font-bold text-white transition-all cursor-pointer">{t("continue")}</button>
                <button onClick={() => setShowSellConfirm(true)} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] text-white shadow-[0_4px_20px_rgba(0,152,234,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110 rounded-full font-bold transition-all cursor-pointer">{t("sell_all")}</button>
              </div>
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center space-y-4 w-full">
               {Array.from({ length: openAmount }).map((_, lineIdx) => (
                 <div key={lineIdx} className="w-full h-32 sm:h-40 bg-black/40 rounded-2xl relative overflow-hidden flex items-center shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
                   <div className="absolute w-1 h-full bg-brand left-1/2 transform -translate-x-1/2 z-20 shadow-[0_0_15px_#f9c23c]"></div>
                   <div 
                     className="absolute left-1/2 flex gap-4 will-change-transform"
                     style={{
                       transform: `translateX(${isOpening ? -(28 * 112 + 48) + (rouletteOffsets[lineIdx] || 0) : -48}px)`,
                       transition: isOpening ? 'transform 5s cubic-bezier(0.15, 1, 0.3, 1)' : 'none'
                     }}
                   >
                     {(rouletteLines[lineIdx] || []).map((itemConfig, i) => {
                       
                       let g: any = null;
                       if (itemConfig?.giftId?.startsWith('gram_')) {
                         const amount = Number(itemConfig.giftId.replace('gram_', ''));
                         g = {
                           id: itemConfig.giftId,
                           name: amount + ' GRAM',
                           image_url: '/gram.webp',
                           isGram: true
                         };
                       } else {
                         g = giftsDb.find(x => x.id === itemConfig?.giftId);
                       }

                       return (
                         <div key={i} className="w-24 h-24 sm:w-24 sm:h-24 shrink-0 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center p-2 transform-gpu">
                           {g?.image_url ? (
                             <PremiumImage src={g.image_url} alt={g.name || ''} className="w-full h-full" staticMode={true} />
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
                     <button onClick={() => setIsFastOpen(!isFastOpen)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${isFastOpen ? "bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white shadow-[0_0_14px_rgba(0,152,234,0.45),inset_0_1px_0_rgba(255,255,255,0.3)] border border-cyan-300/40" : "bg-white/[0.10] hover:bg-white/[0.18] text-white/80 border border-white/[0.14]"}`}>{isFastOpen ? t('fast_open_on') : t('fast_open_off')}</button>
                   </div>
                   <div className="flex gap-2 mb-6">
                     {[1, 2, 3].map(amount => (
                       <button 
                         key={amount}
                         onClick={() => setOpenAmount(amount)}
                         className={`w-12 h-10 rounded-full font-bold flex items-center justify-center transition-all cursor-pointer ${openAmount === amount ? 'bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white shadow-[0_0_14px_rgba(0,152,234,0.45),inset_0_1px_0_rgba(255,255,255,0.3)] border border-cyan-300/40' : 'bg-white/[0.10] hover:bg-white/[0.18] text-white/80 border border-white/[0.14]'}`}
                       >
                         x{amount}
                       </button>
                     ))}
                   </div>
                   <button 
                     onClick={openCases}
                     disabled={balance < selectedCase.price * openAmount}
                     className="w-full max-w-sm py-4 bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] rounded-full text-white font-display font-bold text-[17px] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                   >
                     {t("open_for")} {(selectedCase.price * openAmount).toFixed(2)} <GramIcon className="w-5 h-5" />
                   </button>
                 </div>
               )}
             </div>
          )}
        </div>
        
        {/* Sell Confirm Modal */}
        {showSellConfirm && results && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 max-w-sm w-full relative">
              <div className="flex items-center gap-3 text-brand mb-4">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-bold text-white">{t("sell_all_question")}</h3>
              </div>
              <p className="text-white/70 mb-6">
                {t("sell_all_desc")} {results.length} {t("items_for")} <strong className="text-brand">{Number((results.reduce((sum, r) => sum + (Number(r.floor_price_gram) || Number(r.price) || 0), 0)).toFixed(2))} GRAM</strong>? {t("items_will_be_removed")}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSellConfirm(false)} className="flex-1 py-3 rounded-full bg-white/[0.12] hover:bg-white/[0.20] border border-white/[0.16] font-bold text-white transition-all cursor-pointer">{t("cancel")}</button>
                <button onClick={sellAll} className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] font-bold text-white shadow-[0_4px_18px_rgba(0,152,234,0.45)] hover:brightness-110 transition-all cursor-pointer">{t("sell")}</button>
              </div>
            </div>
          </div>
        )}

        {/* Case Contents List */}
        {!results && (
          <div className="mt-8 mb-4">
            <h3 className="font-bold text-white/70 text-lg mb-4 text-center">{t("case_contents")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

                return (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center p-3 relative h-full">
                    <div className="w-full flex items-center justify-center h-28 mb-3">
                      <PremiumImage src={g.image_url} alt={g.name || ''} className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" staticMode={true} />
                    </div>
                    <div className="text-sm font-bold text-center text-white line-clamp-1 w-full">{g.name}</div>
                    <div className="flex items-center gap-1 mt-1 bg-black/40 px-2 py-1 rounded-lg text-brand text-xs font-bold">
                      {Number(g.floor_price_gram || g.price || 0).toFixed(2)} <GramIcon className="w-3 h-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
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
        <div className="animate-pulse text-white/50 text-center py-10">{t("loading")}</div>
      ) : cases.length === 0 ? (
        <div className="text-center text-white/50 py-10 bg-white/5 rounded-2xl border border-white/10">{t("no_cases")}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {cases.map(c => (
            <div 
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className="bg-[#121214] rounded-3xl flex flex-col cursor-pointer group border border-white/5 overflow-hidden transition-transform active:scale-95"
            >
              <div className="flex-1 w-full relative h-[160px] flex items-center justify-center bg-[#121214] p-4">
                {c.image ? (
                  <PremiumImage src={c.image} alt={c.name} staticMode={true} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <Box className="w-12 h-12 text-white/20" />
                )}
              </div>
              
              <div className="bg-[#242426] p-3 flex flex-col gap-2 w-full">
                <div className="font-bold text-white text-[15px] leading-tight text-center whitespace-normal break-words">{c.name}</div>
                <div className="flex items-center justify-center gap-1.5 bg-[#8b72f8] w-full py-1.5 rounded-xl font-bold text-white shadow-sm shrink-0">
                  <span>{Number(c.price)}</span>
                  <GramIcon className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
