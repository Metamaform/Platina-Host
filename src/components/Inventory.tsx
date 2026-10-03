import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowUpRight, ExternalLink, Diamond, TrendingUp, Shuffle, HelpCircle, Info, AlertCircle } from 'lucide-react';
import { PremiumImage } from './PremiumNftImage';
import { GramIcon } from './GramIcon';
import { LiquidDialog } from './ui/LiquidDialog';
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
    const itemBackdrop = getNftBackdrop(item);
    let itemPrice = Number(item.floor_price_gram || item.price || 0);
    if (giftsDb) {
      const dbItem = giftsDb.find((g: any) => 
        (item.id && g.id === item.id) ||
        (itemBackdrop !== 'Default' && g.backdrop === itemBackdrop && (g.name === item.name || cleanNftName(g.name) === cleanNftName(item.name) || g.slug === item.slug)) ||
        (itemBackdrop === 'Default' && (g.backdrop || 'Default') === 'Default' && (g.name === item.name || cleanNftName(g.name) === cleanNftName(item.name) || g.slug === item.slug))
      ) || giftsDb.find((g: any) => item.name && g.name === item.name);

      if (dbItem && dbItem.floor_price_gram != null && dbItem.floor_price_gram > 0) {
        itemPrice = Number(dbItem.floor_price_gram);
      }
    }
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
      {showHelp && (
        <LiquidDialog
          title={t('help_title')}
          subtitle={t('faq')}
          icon={<Info className="w-4 h-4" />}
          onClose={() => setShowHelp(false)}
          actionLabel={t('help_got_it')}
        >
          <div className="space-y-2.5 pb-1">
            <div className="rounded-2xl p-3.5 bg-white/[0.04] border border-white/[0.08]">
              <p className="text-white text-[13px] font-bold mb-1">{t('help_q1_title')}</p>
              <p className="text-white/75 text-[12px] leading-relaxed">{t('help_q1_text')}</p>
            </div>
            <div className="rounded-2xl p-3.5 bg-white/[0.04] border border-white/[0.08]">
              <p className="text-white text-[13px] font-bold mb-1">{t('help_q2_title')}</p>
              <p className="text-white/75 text-[12px] leading-relaxed">
                {t('help_q2_text1')}<span className="text-brand font-bold">{t('help_q2_text2')}</span>{t('help_q2_text3')}
              </p>
            </div>
            <div className="rounded-2xl p-3.5 bg-white/[0.04] border border-white/[0.08]">
              <p className="text-white text-[13px] font-bold mb-1">{t('help_q3_title')}</p>
              <p className="text-white/75 text-[12px] leading-relaxed">{t('help_q3_text')}</p>
            </div>
          </div>
        </LiquidDialog>
      )}

      {showImportant && (
        <LiquidDialog
          title={t('important_title')}
          subtitle={t('withdraw_rules')}
          tone="amber"
          icon={<AlertCircle className="w-4 h-4" />}
          onClose={() => setShowImportant(false)}
          actionLabel={t('help_got_it')}
        >
          <div className="space-y-2.5 pb-1">
            <p className="text-white/85 text-[13px] leading-relaxed rounded-2xl p-3.5 bg-white/[0.04] border border-white/[0.08]">
              {t('important_text1')}
            </p>
            <p className="text-white/85 text-[13px] leading-relaxed rounded-2xl p-3.5 bg-white/[0.04] border border-amber-500/20">
              {t('important_text2')}
            </p>
            <p className="text-white/85 text-[13px] leading-relaxed rounded-2xl p-3.5 bg-white/[0.04] border border-amber-500/20">
              {t('important_text3')}
            </p>
          </div>
        </LiquidDialog>
      )}

      <div className="premium-card rounded-[26px] p-4 sm:p-5 flex-1 min-h-[400px]">
        <div className="relative z-10 flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button 
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-display font-bold text-xl text-white tracking-tight">{t('my_inventory')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowImportant(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all text-[12px] font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)] cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t('important_btn')}</span>
            </button>
            <button 
              onClick={() => setShowHelp(true)}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] rounded-full transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {inventory.length === 0 ? (
          <div className="relative z-10 premium-card rounded-[24px] p-6 text-center flex flex-col items-center mx-1 mt-4 shadow-xl border border-white/[0.08]">
            <div className="relative z-10 w-16 h-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-5 p-3.5 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              <GramIcon className="w-full h-full text-indigo-400 drop-shadow-md" />
            </div>
            
            <h2 className="relative z-10 text-xl font-bold text-white mb-2 tracking-tight">{t('inventory_empty')}</h2>
            
            <p className="relative z-10 text-white/70 text-[13px] mb-5 leading-relaxed max-w-xs">
              {t('empty_backpack_desc1')}
            </p>

            <a 
              href="https://t.me/platina_relayer" 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative z-10 w-full max-w-xs primary-button text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-transform mb-3 cursor-pointer shadow-md"
            >
              <ExternalLink className="w-4 h-4 text-white" />
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
              className="relative z-10 w-full max-w-xs bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.10] text-white font-bold py-3.5 rounded-2xl transition-transform cursor-pointer"
            >
              {t('empty_backpack_btn2')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-24 px-0.5">

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
                  className={`flex flex-col gap-2.5 w-full mx-auto p-2.5 rounded-[24px] border ${
                    isBlack 
                      ? 'bg-[radial-gradient(circle,#353637_0%,#000000_100%)] border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.5)]' 
                      : isOnyx 
                        ? 'bg-[radial-gradient(circle,#4c5153_0%,#393d3f_100%)] border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.5)]' 
                        : 'bg-[#16181d] border-[#3b82f6]/25 shadow-[0_8px_25px_rgba(0,0,0,0.3)]'
                  } ${
                    item.isWithdrawing ? 'opacity-80 grayscale-[0.3]' : ''
                  }`}
                >
                  <div className="w-full flex justify-center pt-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#c7c7cc]">
                        {isOnyx ? 'Onyx Black' : isBlack ? 'Black' : (dbItem?.rarity || item.rarity || 'Common')}
                      </span>
                      <span className="text-[8px] text-white/30 font-semibold tracking-wider uppercase mt-0.5">Platina Gift</span>
                    </div>
                  </div>
                  <div 
                    className={`relative overflow-hidden w-full aspect-square rounded-[20px] flex flex-col items-center p-1 transition-opacity duration-200 ${
                      item.isWithdrawing ? 'blur-[2px]' : ''
                    }`}
                  >
                    <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-1">
                      <PremiumImage 
                        staticMode={false} 
                        isPlaying={activeAnimIndex === i}
                        onAnimationComplete={() => handleNextAnim(i)}
                        src={displayImage} 
                        alt={displayName} 
                        className="w-[85%] h-[85%] object-contain drop-shadow-md" 
                      />
                    </div>
                    <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0 pb-1.5 px-1">
                      <span className="text-[12px] text-white/90 w-full text-center font-bold leading-tight line-clamp-1">{cleanNftName(displayName)}</span>
                      <span className="text-[12px] font-bold text-white flex items-center justify-center gap-1 mt-0.5">{currentPrice.toFixed(2)} <GramIcon className="w-3.5 h-3.5" /></span>
                    </div>
                    
                    {item.isWithdrawing && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-[18px]">
                         <span className="text-white text-[11px] font-bold bg-black/60 border border-white/10 px-3 py-1 rounded-full">{t('withdraw_pending')}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-1.5 w-full mt-0.5">
                    {/* Game Buttons - Upgrade / Contract */}
                    <div className="flex gap-1.5 w-full">
                      <button 
                        onClick={() => onPlayUpgrade && onPlayUpgrade()}
                        disabled={item.isWithdrawing}
                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:opacity-80 transition-opacity px-0.5 ${
                          item.isWithdrawing ? 'bg-green-500/20 text-green-500/50 opacity-50 blur-[1px]' : 'bg-[#22c55e] text-white shadow-sm'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t('upgrade')}</span>
                      </button>
                      <button 
                        onClick={() => onPlayCraft && onPlayCraft()}
                        disabled={item.isWithdrawing}
                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:opacity-80 transition-opacity px-0.5 ${
                          item.isWithdrawing ? 'opacity-50 blur-[1px] bg-white/5 text-white/50' : 'bg-[#ef4444] text-white shadow-sm'
                        }`}
                      >
                        <Shuffle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t('craft')}</span>
                      </button>
                    </div>

                    <button 
                      onClick={() => handleToggleWithdraw(item)}
                      className={`w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 active:opacity-80 transition-opacity ${
                        item.isWithdrawing 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                          : 'bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.08]'
                      }`}
                    >
                      {item.isWithdrawing ? t('cancel') : (
                        <>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {t('withdraw')}
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => handleSell({ ...item, price: currentPrice })}
                      disabled={item.isWithdrawing}
                      className={`w-full py-2.5 flex items-center justify-center gap-1.5 rounded-xl text-[11px] font-bold active:opacity-80 transition-opacity ${
                        item.isWithdrawing ? 'bg-[#181a20] text-white/20 opacity-50 blur-[1px]' : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_4px_14px_rgba(99,102,241,0.25)]'
                      }`}
                    >
                      {t('sell')} {currentPrice.toFixed(2)} <GramIcon className="w-3.5 h-3.5 opacity-90" />
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