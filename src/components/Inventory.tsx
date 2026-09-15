import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft, ArrowUpRight, ExternalLink, Diamond, TrendingUp, Shuffle, HelpCircle, Info } from 'lucide-react';
import { PremiumImage } from './PremiumImage';
import { GramIcon } from './GramIcon';
import { useTranslation } from '../lib/i18n';

export function Inventory({
  inventory,
  setInventory,
  balance,
  setBalance,
  turnover,
  giftsDb,
  onGoToCases,
  onPlayUpgrade,
  onPlayCraft
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
}) {
  const { t } = useTranslation();
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (showHelp) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [showHelp]);

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
        fetch('/api/bot/notify-withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ nftName: item.name })
        }).catch(console.error);
      }
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <AnimatePresence>
        {showHelp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] bg-black/60"
              onClick={() => setShowHelp(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed z-[1000] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[#1a1c23] border border-white/10 rounded-[28px] p-6 shadow-2xl flex flex-col"
            >
              <button 
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white bg-white/5 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                <Info className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4">{t('help_title')}</h3>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-white/80 text-[13px] leading-relaxed">
                    <strong className="text-white">{t('help_q1_title')}</strong><br/>
                    {t('help_q1_text')}
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-white/80 text-[13px] leading-relaxed">
                    <strong className="text-white">{t('help_q2_title')}</strong><br/>
                    {t('help_q2_text1')}<span className="text-blue-400 font-bold">{t('help_q2_text2')}</span>{t('help_q2_text3')}
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-white/80 text-[13px] leading-relaxed">
                    <strong className="text-white">{t('help_q3_title')}</strong><br/>
                    {t('help_q3_text')}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full mt-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold rounded-xl active:scale-95 transition-all"
              >
                {t('help_got_it')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="glass-panel rounded-[32px] overflow-hidden p-4 sm:p-5 flex-1 min-h-[400px] border border-white/5">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-display font-bold text-xl">{t('my_inventory')}</h3>
          <button 
            onClick={() => setShowHelp(true)}
            className="p-1.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {inventory.length === 0 ? (
          <div className="bg-[#181a20]/60 rounded-[32px] p-6 text-center flex flex-col items-center border border-white/5 mx-2 mt-4">
            <div className="w-16 h-16 bg-[#2a2c33] rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(42,171,238,0.2)] relative overflow-hidden p-2.5">
              <div className="absolute inset-0 bg-[#2aabee]/10" />
              <GramIcon className="w-full h-full relative z-10 text-[#2aabee]" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-3">{t('inventory_empty')}</h2>
            
            <p className="text-white/60 text-[13px] mb-6 leading-relaxed px-2">
              {t('empty_backpack_desc1')}
            </p>

            <a 
              href="https://t.me/platina_relayer" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors mb-4 active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              {t('empty_backpack_btn1')}
            </a>

            <p className="text-white/40 text-[11px] mb-6 px-4 leading-tight">
              {t('empty_backpack_note')}
            </p>

            <div className="flex items-center w-full mb-6 gap-3 px-4">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-white/40 text-[10px] font-bold tracking-widest">{t('empty_backpack_or')}</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <p className="text-white/60 text-[13px] mb-6 leading-relaxed px-2">
              {t('empty_backpack_desc2')}
            </p>

            <button 
              onClick={onGoToCases}
              className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 font-semibold py-3.5 rounded-2xl transition-colors active:scale-95"
            >
              {t('empty_backpack_btn2')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-24 px-1">

            {inventory.map((item, i) => {
              let currentPrice = Number(item.price);
              if (giftsDb) {
                const dbItem = giftsDb.find((g: any) => g.name === item.name || g.image_url === item.image_url);
                if (dbItem && dbItem.floor_price_gram != null) {
                  currentPrice = Number(dbItem.floor_price_gram);
                }
              }
              return (
                <div
                  key={item.uniqueId || i}
                  className={`flex flex-col gap-2.5 w-full mx-auto p-2 rounded-[28px] border border-[#3b82f6]/20 bg-[#16181d] shadow-[0_4px_20px_-10px_rgba(59,130,246,0.1)] transition-all duration-300 ${
                    item.isWithdrawing ? 'opacity-80 grayscale-[0.3]' : ''
                  }`}
                >
                  <div className="w-full flex justify-center pt-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-[#3b82f6] uppercase tracking-widest">Random</span>
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
                        loopWithDelay={true} 
                        loopDelayMs={5000} 
                        delayMs={i * 800} 
                        src={item.image_url || `/nft/${item.name}.png`} 
                        alt={item.name} 
                        className="w-[85%] h-[85%] object-contain drop-shadow-lg" 
                      />
                    </div>
                    <div className="relative z-20 w-full flex flex-col items-center justify-end shrink-0 pb-1.5 px-1">
                      <span className="text-[12px] text-white/90 w-full text-center font-bold leading-tight line-clamp-2">{item.name}</span>
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
              );
            })}
            
          </div>
        )}
      </div>
    </div>
  );
}