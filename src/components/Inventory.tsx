import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft, ArrowUpRight, ExternalLink, Diamond, TrendingUp, Shuffle, HelpCircle, Info, AlertCircle } from 'lucide-react';
import { PremiumImage } from './PremiumImage';
import { GramIcon } from './GramIcon';
import { useTranslation } from '../lib/i18n';
import { cleanNftName, getNftBackdrop } from '../lib/nftUtils';

export function Inventory({
  inventory,
  setInventory,
  balance,
  setBalance,
  turnover,
  giftsDb,
  onGoToCases,
  onPlayUpgrade,
  onPlayCraft,
  onBack
}: {
  inventory: any[];
  setInventory: any;
  balance: number;
  setBalance: any;
  turnover: number;
  giftsDb?: any[];
  onGoToCases: () => void;
  onPlayUpgrade?: () => void;
  onPlayCraft?: () => void;
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showImportant, setShowImportant] = useState(false);
  const [activeAnimIndex, setActiveAnimIndex] = useState<number>(0);

  const handleNextAnim = useCallback((fromIndex: number) => {
    setActiveAnimIndex((current) => {
      if (current !== fromIndex) return current;
      if (current >= inventory.length - 1) {
        return -1; // Finished round, trigger 3-second pause
      }
      return current + 1;
    });
  }, [inventory.length]);

  useEffect(() => {
    if (activeAnimIndex === -1 && inventory.length > 0) {
      const pauseTimer = setTimeout(() => {
        setActiveAnimIndex(0);
      }, 3000);
      return () => clearTimeout(pauseTimer);
    }
  }, [activeAnimIndex, inventory.length]);

  useEffect(() => {
    if (activeAnimIndex < 0 || activeAnimIndex >= inventory.length) return;

    // Safety fallback: if animation doesn't fire complete, progress after 2.8s
    const fallbackTimer = setTimeout(() => {
      handleNextAnim(activeAnimIndex);
    }, 2800);

    return () => clearTimeout(fallbackTimer);
  }, [activeAnimIndex, inventory.length, handleNextAnim]);

  useEffect(() => {
    if (inventory.length > 0 && activeAnimIndex >= inventory.length) {
      setActiveAnimIndex(0);
    }
  }, [inventory.length, activeAnimIndex]);

  useEffect(() => {
    if (showHelp || showImportant) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [showHelp, showImportant]);

  const handleSell = (item: any) => {
    const itemPrice = Number(item.price);
    setBalance((prev: number) => {
      const newBal = Number((prev + itemPrice).toFixed(2));
      setInventory((prevInv: any[]) => {
        const newInv = prevInv.filter(i => i.uniqueId !== item.uniqueId);
        // Save state immediately
        fetch('/api/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}`
          },
          body: JSON.stringify({ balance: newBal, inventory: newInv, turnover })
        }).catch(()=>{});
        return newInv;
      });
      return newBal;
    });
    setSelectedNft(null);
  };

  const handleToggleWithdraw = (item: any) => {
    const isStartingWithdraw = !item.isWithdrawing;
    setInventory((prev: any[]) => prev.map(i => i.uniqueId === item.uniqueId ? { ...i, isWithdrawing: isStartingWithdraw } : i));
    setSelectedNft((prev: any) => ({ ...prev, isWithdrawing: isStartingWithdraw }));
    
    if (isStartingWithdraw) {
      const token = sessionStorage.getItem('pg_session_token');
      if (token) {
        const dbItem = giftsDb ? giftsDb.find((g: any) => (item.slug && g.slug === item.slug) || g.name === item.name || g.image_url === item.image_url) : null;
        const displayName = dbItem ? dbItem.name : item.name;
        
        fetch('/api/bot/notify-withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ nftName: displayName })
        }).catch(console.error);
      }
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowHelp(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="group relative z-10 w-full max-w-sm bg-[#16171b]/95 backdrop-blur-2xl border border-white/[0.12] rounded-[28px] p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* верхний блик жидкого стекла */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
              />

              {/* Заголовок с кнопкой закрытия без наложений */}
              <div className="relative z-10 flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.08] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/40 text-brand shadow-[0_0_14px_rgba(0,152,234,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">{t('help_title')}</h3>
                    <p className="text-[11px] text-white/50 mt-0.5">Частые вопросы</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHelp(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.12] active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="relative z-10 overflow-y-auto space-y-2.5 pr-0.5 custom-scrollbar flex-1">
                <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <p className="text-white text-[13px] font-bold mb-1">{t('help_q1_title')}</p>
                  <p className="text-white/75 text-[12px] leading-relaxed">
                    {t('help_q1_text')}
                  </p>
                </div>
                
                <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <p className="text-white text-[13px] font-bold mb-1">{t('help_q2_title')}</p>
                  <p className="text-white/75 text-[12px] leading-relaxed">
                    {t('help_q2_text1')}<span className="text-brand font-bold">{t('help_q2_text2')}</span>{t('help_q2_text3')}
                  </p>
                </div>
                
                <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <p className="text-white text-[13px] font-bold mb-1">{t('help_q3_title')}</p>
                  <p className="text-white/75 text-[12px] leading-relaxed">
                    {t('help_q3_text')}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowHelp(false)}
                className="relative z-10 w-full mt-4 py-3 bg-brand/20 border border-brand/40 hover:bg-brand/30 text-white font-bold rounded-full active:scale-95 transition-all shadow-[0_0_14px_rgba(0,152,234,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] cursor-pointer text-sm shrink-0"
              >
                {t('help_got_it')}
              </button>
            </motion.div>
          </div>
        )}

        {showImportant && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowImportant(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="group relative z-10 w-full max-w-sm bg-[#16171b]/95 backdrop-blur-2xl border border-amber-500/30 rounded-[28px] p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* верхний блик жидкого стекла */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
              />

              {/* Заголовок с кнопкой закрытия без наложений */}
              <div className="relative z-10 flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.08] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">{t('important_title')}</h3>
                    <p className="text-[11px] text-amber-400/70 mt-0.5">Правила вывода</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowImportant(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.12] active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="relative z-10 overflow-y-auto space-y-2.5 pr-0.5 custom-scrollbar flex-1">
                <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <p className="text-white/85 text-[12.5px] leading-relaxed">
                    {t('important_text1')}
                  </p>
                </div>
                
                <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-amber-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <p className="text-white/85 text-[12.5px] leading-relaxed">
                    {t('important_text2')}
                  </p>
                </div>

                <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-amber-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <p className="text-white/85 text-[12.5px] leading-relaxed">
                    {t('important_text3')}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowImportant(false)}
                className="relative z-10 w-full mt-4 py-3 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-bold rounded-full active:scale-95 transition-all shadow-[0_0_14px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] cursor-pointer text-sm shrink-0"
              >
                {t('help_got_it')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="group relative overflow-hidden bg-white/[0.07] backdrop-blur-2xl border border-white/[0.10] rounded-[32px] p-4 sm:p-5 flex-1 min-h-[400px] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_18px_45px_-16px_rgba(0,0,0,0.85)]">
        {/* верхнее бликовое свечение жидкого стекла */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
        />

        <div className="relative z-10 flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button 
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-display font-bold text-xl text-white tracking-tight">{t('my_inventory')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowImportant(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 active:scale-95 transition-all text-[12px] font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)] cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t('important_btn')}</span>
            </button>
            <button 
              onClick={() => setShowHelp(true)}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.10] rounded-full transition-all active:scale-95 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {inventory.length === 0 ? (
          <div className="relative z-10 group overflow-hidden bg-white/[0.05] backdrop-blur-xl border border-white/[0.10] rounded-[28px] p-6 text-center flex flex-col items-center mx-2 mt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_15px_35px_-10px_rgba(0,0,0,0.7)]">
            {/* верхний блик жидкого стекла в карточке пустого инвентаря */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.01)_40%,transparent_62%)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-4/5 h-16 rounded-full bg-white/[0.08] blur-2xl opacity-70"
            />

            <div className="relative z-10 w-16 h-16 rounded-full bg-brand/20 border border-brand/40 text-brand shadow-[0_0_20px_rgba(0,152,234,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center mb-5 p-3.5">
              <GramIcon className="w-full h-full text-brand drop-shadow-md" />
            </div>
            
            <h2 className="relative z-10 text-xl font-bold text-white mb-2 tracking-tight">{t('inventory_empty')}</h2>
            
            <p className="relative z-10 text-white/70 text-[13px] mb-5 leading-relaxed max-w-xs">
              {t('empty_backpack_desc1')}
            </p>

            <a 
              href="https://t.me/platina_relayer" 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative z-10 w-full max-w-xs bg-brand/20 hover:bg-brand/30 border border-brand/40 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all shadow-[0_0_14px_rgba(0,152,234,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] mb-3 active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-brand" />
              <span>{t('empty_backpack_btn1')}</span>
            </a>

            <p className="relative z-10 text-white/50 text-[11px] mb-5 max-w-xs leading-tight">
              {t('empty_backpack_note')}
            </p>

            <div className="relative z-10 flex items-center w-full max-w-xs mb-5 gap-3">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-white/40 text-[10px] font-bold tracking-widest uppercase">{t('empty_backpack_or')}</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <p className="relative z-10 text-white/70 text-[13px] mb-5 leading-relaxed max-w-xs">
              {t('empty_backpack_desc2')}
            </p>

            <button 
              onClick={onGoToCases}
              className="relative z-10 w-full max-w-xs bg-brand/20 hover:bg-brand/30 border border-brand/40 text-white font-bold py-3.5 rounded-full transition-all shadow-[0_0_14px_rgba(0,152,234,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] active:scale-95 cursor-pointer"
            >
              {t('empty_backpack_btn2')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-24 px-1">

            {inventory.map((item, i) => {
              const itemBackdrop = getNftBackdrop(item);
              let currentPrice = Number(item.floor_price_gram || item.price || 0);

              let dbItem: any = null;
              if (giftsDb) {
                dbItem = giftsDb.find((g: any) => 
                  (item.id && g.id === item.id) ||
                  (itemBackdrop !== 'Default' && g.backdrop === itemBackdrop && (g.name === item.name || cleanNftName(g.name) === cleanNftName(item.name) || g.slug === item.slug)) ||
                  (itemBackdrop === 'Default' && (g.backdrop || 'Default') === 'Default' && (g.name === item.name || cleanNftName(g.name) === cleanNftName(item.name) || g.slug === item.slug))
                ) || giftsDb.find((g: any) => item.name && g.name === item.name);

                if (dbItem && dbItem.floor_price_gram != null) {
                  currentPrice = Number(dbItem.floor_price_gram);
                }
              }

              const displayName = item.displayName || dbItem?.name || item.name;
              const displayImage = (dbItem && (dbItem.backdrop === itemBackdrop || itemBackdrop === 'Default'))
                ? (dbItem.lottie_url || dbItem.image_url)
                : (item.displayImage || item.image_url || dbItem?.lottie_url || dbItem?.image_url || `/nft/${item.name}.png`);

              if (itemBackdrop !== 'Default') {
                item.backdrop = itemBackdrop;
              } else if (dbItem?.backdrop) {
                item.backdrop = dbItem.backdrop;
              }
              item.displayImage = displayImage;

              const isOnyx = itemBackdrop === 'Onyx Black';
              const isBlack = itemBackdrop === 'Black';

              return (
                <div key={item.uniqueId || i} className="w-full">
                <div
                  className={`flex flex-col gap-2.5 w-full mx-auto p-2 rounded-[28px] border ${
                    isBlack 
                      ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/10' 
                      : isOnyx 
                        ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/10' 
                        : 'bg-[#16181d] border-[#3b82f6]/20'
                  } ${
                    item.isWithdrawing ? 'opacity-80 grayscale-[0.3]' : ''
                  }`}
                >
                  <div className="w-full flex justify-center pt-1">
                    <div className="flex flex-col items-center">
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${
                        isOnyx ? 'text-zinc-300' : isBlack ? 'text-zinc-400' : 'text-[#3b82f6]'
                      }`}>
                        {isOnyx ? 'Onyx Black' : isBlack ? 'Black' : 'Random'}
                      </span>
                      <span className="text-[8px] text-white/20 font-bold tracking-widest uppercase mt-0.5">Platina Gift</span>
                    </div>
                  </div>
                  <div 
                    className={`relative overflow-hidden w-full aspect-square rounded-[20px] flex flex-col items-center p-1 transition-all duration-300 ${
                      item.isWithdrawing ? 'blur-[2px]' : ''
                    }`}
                  >
                    <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-2">
                      <PremiumImage 
                        staticMode={false} 
                        isPlaying={activeAnimIndex === i}
                        onAnimationComplete={() => handleNextAnim(i)}
                        src={displayImage} 
                        alt={displayName} 
                        className="w-[85%] h-[85%] object-contain drop-shadow-lg" 
                      />
                    </div>
                    <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0 pb-1.5 px-1">
                      <span className="text-[12px] text-white/90 w-full text-center font-bold leading-tight line-clamp-2">{cleanNftName(displayName)}</span>
                      <span className="text-[13px] font-bold text-white flex items-center justify-center gap-1 mt-0.5">{currentPrice.toFixed(2)} <GramIcon className="w-3.5 h-3.5" /></span>
                    </div>
                    
                    {item.isWithdrawing && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                         <span className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded-full">{t('withdraw_pending') || 'Pending'}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-1.5 w-full mt-1">
                    {/* Game Buttons - Upgrade / Contract (Now at the top) */}
                    <div className="flex gap-1.5 w-full">
                      <button 
                        onClick={() => onPlayUpgrade && onPlayUpgrade()}
                        disabled={item.isWithdrawing}
                        className={`flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all px-0.5 ${
                          item.isWithdrawing ? 'bg-green-500/20 text-green-500/50 opacity-50 blur-[1px]' : 'bg-[#22c55e] text-white hover:bg-[#16a34a]'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t('upgrade')}</span>
                      </button>
                      <button 
                        onClick={() => onPlayCraft && onPlayCraft()}
                        disabled={item.isWithdrawing}
                        className={`flex-1 py-2.5 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all px-0.5 ${
                          item.isWithdrawing ? 'opacity-50 blur-[1px] bg-white/5 text-white/50' : 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                        }`}
                      >
                        <Shuffle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t('craft')}</span>
                      </button>
                    </div>

                    <button 
                      onClick={() => handleToggleWithdraw(item)}
                      className={`w-full py-3 rounded-[10px] text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                        item.isWithdrawing 
                          ? 'bg-danger/20 text-danger border border-danger/30' 
                          : 'bg-brand text-white hover:bg-brand/90'
                      }`}
                    >
                      {item.isWithdrawing ? t('cancel') : (
                        <>
                          <ArrowUpRight className="w-4 h-4" />
                          {t('withdraw')}
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => handleSell({ ...item, price: currentPrice })}
                      disabled={item.isWithdrawing}
                      className={`w-full py-3 flex items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-bold active:scale-95 transition-all ${
                        item.isWithdrawing ? 'bg-[#181a20] text-white/20 opacity-50 blur-[1px]' : 'bg-[#2a2c33] text-white/90 hover:bg-white/10'
                      }`}
                    >
                      {t('sell')} {currentPrice.toFixed(2)} <GramIcon className="w-4 h-4 opacity-80" />
                    </button>
                  </div>
                </div>
                </div>
              );
            })}
            
          </div>
        )}
      </div>
    </div>
  );
}