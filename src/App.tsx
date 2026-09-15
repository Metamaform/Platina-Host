import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { setLoggerUserId } from './lib/logger';
import { ShoppingBag, User, Gem, Gift, Wallet, ChevronRight, Activity, CircleDashed, ArrowUpCircle, Shield, LayoutGrid, Trophy, X, ListTodo, Settings, Bomb, Box, Package, ArrowLeft, Users, History, MessageCircle, ExternalLink, Copy, Check, Star, Rocket } from 'lucide-react';
import defaultGiftsDb from './gifts_data.json';
import { Craft } from './components/Craft';
import { Upgrade } from './components/Upgrade';
import { Mines } from './components/Mines';
import { NewGame } from './components/NewGame';
import { LiveFeed } from './components/LiveFeed';
import { PremiumImage } from './components/PremiumImage';
import { AdminPanel } from './components/AdminPanel';
import { Cases } from './components/Cases';
import { Leaderboard } from './components/Leaderboard';
import { Tasks } from './components/Tasks';
import { GramIcon } from './components/GramIcon';
import { TopUpModal } from './components/TopUpModal';
import { addTurnover } from './lib/stats';
import { useTelegramAuth } from './lib/useTelegramAuth';
import { useTranslation, i18n } from './lib/i18n';
import { CleanModelLottie } from './components/CleanModelLottie';
import { Inventory } from './components/Inventory';
import { fetchFragmentPrices } from './lib/api';
import { WelcomeScreen } from './components/WelcomeScreen';




function UpgradeAnimatedIcon() {
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <motion.div
        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.3, 0.7, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        className="absolute inset-1 rounded-full bg-gradient-to-tr from-brand/40 via-violet-500/30 to-cyan-400/40 blur-md pointer-events-none"
      />
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <ArrowUpCircle className="w-9 h-9 text-brand drop-shadow-[0_0_8px_rgba(120,120,255,0.5)]" />
      </div>
    </div>
  );
}

function CraftAnimatedIcon() {
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="absolute inset-1 rounded-full bg-gradient-to-tr from-emerald-500/40 via-teal-500/30 to-green-400/40 blur-md pointer-events-none"
      />
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <CircleDashed className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
      </div>
    </div>
  );
}

function Shop({  onPlayUpgrade, onPlayCraft, onPlayMines, onPlayNewGame, giftsDb, pricesLoaded }: { onPlayUpgrade: () => void, onPlayCraft: () => void, onPlayMines: () => void, onPlayNewGame: () => void, giftsDb: any[], pricesLoaded: boolean }) {
  const { t, lang } = useTranslation();
  const getLocalizedImage = (id: string, base: string) => {
    if (lang === 'zh') {
      if (id === 'upgrade') return '/apgreyd_chaina.png';
      if (id === 'craft') return '/craft_chaina.png';
      if (id === 'mines') return '/mines_chaina.png';
      if (id === 'subscribe') return '/subscribe_chaina.png';
    } else if (lang === 'en') {
      if (id === 'upgrade') return '/upgrade_en.png';
      if (id === 'craft') return '/craft_en.png';
      if (id === 'mines') return '/mines_en.png';
      if (id === 'subscribe') return '/subscribe_en.png';
    }
    return base;
  };

  const games: { id: string; name: string; description: string; color?: string; badge?: string; image?: string; customIcon?: any; fullCardImage?: string }[] = [
    {
      id: 'upgrade',
      name: t('upgrade'),
      description: t('upgrade_desc'),
      fullCardImage: getLocalizedImage('upgrade', '/apgreyd_nft.png?v=2'),
      color: 'from-brand/25 via-violet-500/20 to-cyan-500/25',
      badge: t('hot')
    },
    {
      id: 'craft',
      name: t('craft'),
      description: t('craft_desc'),
      fullCardImage: getLocalizedImage('craft', '/kraft_nft.png?v=4'),
      color: 'from-emerald-500/25 via-teal-500/20 to-green-500/25',
      badge: t('new')
    },
    {
      id: 'mines',
      name: t('mines'),
      description: t('mines_desc'),
      fullCardImage: getLocalizedImage('mines', '/mines_nft.jpg?v=5')
    },
    {
      id: 'new_game',
      name: t('new_game'),
      description: t('new_game_desc'),
      color: 'from-amber-500/25 via-orange-500/20 to-yellow-500/25',
      badge: t('soon'),
      customIcon: () => (
        <div className="relative w-14 h-14 flex items-center justify-center">
          <motion.div
            animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="absolute inset-1 rounded-full bg-gradient-to-tr from-amber-500/30 via-orange-500/20 to-yellow-400/30 blur-md pointer-events-none"
          />
          <Rocket className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] relative z-10 rotate-45" />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <LiveFeed />
      
      <a 
        href="https://t.me/Platina_Gift"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-3xl overflow-hidden cursor-pointer transform-gpu active:scale-[0.98] transition-transform isolate bg-transparent relative" style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
      >
        <img 
          src={getLocalizedImage('subscribe', '/subscribe_nft.jpg') || undefined} 
          alt="Subscribe" 
          className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.02] rounded-3xl "
        />
      </a>

      <h2 className="font-display text-2xl font-semibold mb-6 px-1 pt-2">{t('popular_games')}</h2>
      <div className="grid grid-cols-1 gap-4">
        {games.map(game => {
          if (game.fullCardImage) {
            return (
              <div 
                key={game.id} 
                onClick={() => { 
                  if (game.id === 'upgrade') onPlayUpgrade(); 
                  if (game.id === 'craft') onPlayCraft();
                  if (game.id === 'mines') onPlayMines();
                  if (game.id === 'new_game') onPlayNewGame();
                  }}
                className="rounded-3xl overflow-hidden cursor-pointer group w-full relative transform-gpu isolate bg-transparent" style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
              >
                <img src={game.fullCardImage || undefined} alt={typeof game.name === 'string' ? game.name : ''} className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-300 rounded-3xl" />
              </div>
            );
          }

          return (
          <div 
            key={game.id} 
            onClick={() => { 
              if (game.id === 'upgrade') onPlayUpgrade(); 
              if (game.id === 'craft') onPlayCraft();
              if (game.id === 'mines') onPlayMines();
              if (game.id === 'new_game') onPlayNewGame();
              }}
            className="glass-panel-interactive rounded-2xl p-6 flex flex-col cursor-pointer group"
          >
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} p-[1px] shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                <div className="w-full h-full rounded-2xl bg-black/80 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5 group-hover:bg-transparent transition-colors" />
                  {game.image ? (
                    <img src={game.image || undefined} alt={typeof game.name === 'string' ? game.name : ''} className="w-full h-full object-cover rounded-2xl relative z-10" />
                  ) : game.customIcon ? (
                    <game.customIcon />
                  ) : null}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-display text-xl font-semibold">{typeof game.name === 'string' ? game.name.toUpperCase() : game.name}</h3>
                  {game.badge && (
                    <span className="px-2 py-0.5 rounded-md bg-danger/15 text-danger text-[10px] font-bold uppercase tracking-wider border border-danger/30">
                      {game.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted leading-tight">{game.description}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-muted group-hover:text-[color:var(--color-text)] transition-colors" />
            </div>
          </div>
          )})}
      </div>
    </div>
  );
}

function Gifts({  giftsDb, pricesLoaded }: { giftsDb: any[], pricesLoaded?: boolean }) {
  const { t } = useTranslation();
  const gifts = giftsDb.map(data => {
    // Генерация цвета и паттерна на основе ID
    const numId = parseInt(data.id) || Math.floor(Math.random() * 100);
    
    return {
      id: data.id,
      name: data.name,
      price: data.floor_price_gram,
      imageByName: data.image_url,
                  
      
      rarityText: data.rarity
    };
  });

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-semibold mb-6 px-1">{t('nft_gifts')}</h2>
      <div className="grid grid-cols-2 gap-4">
        {gifts.map(gift => {
          // Define rarity based on price
          let rarity = { label: t('common'), color: 'text-muted bg-white/5 border-white/15' };
          if (gift.price > 80) rarity = { label: t('legendary'), color: 'text-gold bg-gold/10 border-gold/30' };
          else if (gift.price > 50) rarity = { label: t('epic'), color: 'text-brand bg-brand/10 border-brand/30' };
          else if (gift.price > 20) rarity = { label: t('rare'), color: 'text-sky-300 bg-sky-400/10 border-sky-400/30' };

          return (
          <div id={`gift-${gift.id}`} key={gift.id} className="facet-card glass-panel-interactive rounded-2xl p-3 flex flex-col items-center cursor-pointer group">
            <div className={`w-full aspect-square rounded-xl overflow-hidden mb-3 relative bg-white/5`}>
              
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 z-0" />
              <PremiumImage staticMode src={gift.imageByName}
                alt={gift.name}
                className="w-full h-full object-cover relative z-10 drop-shadow-2xl group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500"
              />
              <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border z-20 backdrop-blur-md ${rarity.color}`}>
                {rarity.label}
              </div>
            </div>
            <div className="w-full text-center relative z-10">
              <div className="text-xs font-medium text-[color:var(--color-text)] mb-1 truncate px-1">{gift.name}</div>
              {pricesLoaded ? (
                gift.price != null && (
                  <div className="flex items-center justify-center gap-1.5 bg-black/40 rounded-lg py-1">
                    <span className="font-display text-xs font-bold text-gold">
                      {gift.price.toFixed(2)}
                    </span>
                    <GramIcon className="w-4 h-4 drop-shadow-md" />
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center gap-1.5 bg-black/40 rounded-lg py-1 animate-pulse">
                  <div className="h-4 w-12 bg-white/20 rounded"></div>
                  <div className="w-4 h-4 bg-white/20 rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        )})}
      </div>

    </div>
  );
}


function Profile({  user, inventory, setInventory, balance, setBalance, turnover, topups, onOpenTopUp, config, giftsDb, onBack }: { user: any, inventory: any[], setInventory: any, balance: number, setBalance: any, turnover: number, topups: any[], onOpenTopUp: () => void, config?: any, giftsDb?: any[], onBack?: () => void }) {
  const { t, setLang, lang } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const handleSetLang = (l: 'en' | 'ru' | 'zh') => {
    setLang(l);
    const token = sessionStorage.getItem('pg_session_token');
    if (token) {
      fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: l })
      }).catch(console.error);
    }
  };

  const firstName = user?.firstName || 'Alexey';
  const username = user?.username ? `@${user.username}` : '@alexey_dev';
  const photoUrl = user?.photoUrl;
  
  const [selectedNft, setSelectedNft] = useState<any>(null);

  const handleSell = (nft: any) => {
    setBalance((b: number) => b + nft.price);
    setInventory((inv: any[]) => inv.filter((i: any) => i.uniqueId !== nft.uniqueId));
    setSelectedNft(null);
  };

  const handleToggleWithdraw = (nft: any) => {
    const isWithdrawing = !nft.isWithdrawing;
    setInventory((inv: any[]) => inv.map((i: any) => i.uniqueId === nft.uniqueId ? { ...i, isWithdrawing } : i));
    setSelectedNft({ ...nft, isWithdrawing });
  };

  const [showLevelModal, setShowLevelModal] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showReferrals, setShowReferrals] = useState<boolean>(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<{msg: string, type: 'error'|'success'} | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleActivatePromo = async () => {
    if (!promoCode.trim() || isActivating) return;
    setIsActivating(true);
    setPromoStatus(null);
    try {
      const res = await fetch('/api/promocodes/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}`
        },
        body: JSON.stringify({ code: promoCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setPromoStatus({ msg: t('promo_success'), type: 'success' });
        if (data.type === 'gram') {
          setBalance((b: number) => b + data.addedGrams);
        } else if (data.type === 'nft' && data.addedItem) {
          setInventory((inv: any[]) => [...inv, data.addedItem]);
        }
        setPromoCode('');
      } else {
        setPromoStatus({ msg: data.error || 'Error', type: 'error' });
      }
    } catch (e) {
      setPromoStatus({ msg: 'Promo code not found', type: 'error' });
    }
    setIsActivating(false);
  };



  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);
  useEffect(() => {
    if (showReferrals) {
      setIsLoadingReferrals(true);
      fetch('/api/referrals', {
        headers: {
          'Authorization': `Bearer ${(window as any).Telegram?.WebApp?.initData}`
        }
      })
      .then(r => r.json())
      .then(data => {
        if (data.referrals) {
          setReferrals(data.referrals);
        }
      })
      .finally(() => {
        setIsLoadingReferrals(false);
      });
    }
  }, [showReferrals]);

  const maxLevel = 100;
  const levelThreshold = 1000;
  const currentLevel = Math.min(maxLevel, Math.floor(turnover / levelThreshold) + 1);
  const currentLevelProgress = turnover % levelThreshold;
  const isMax = currentLevel === maxLevel;
  const progressPercent = isMax ? 100 : (currentLevelProgress / levelThreshold) * 100;

  return (
    <div className="space-y-6 relative">

      <div className="flex flex-col items-center justify-center pt-1 pb-4 relative mt-[-10px]">
        <button onClick={() => setShowSettings(true)} className="absolute top-[-10px] right-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors active:scale-95 z-20">
          <Settings className="w-5 h-5" />
        </button>
        {onBack && (
          <button onClick={onBack} className="absolute top-[-10px] left-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors active:scale-95 z-20">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="relative mb-4 mt-2">

          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand to-gold p-[2px] shadow-lg shadow-brand/20">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
               <div className="absolute inset-0 bg-white/5" />
               {photoUrl ? (
                 <img src={photoUrl || undefined} alt={firstName} className="w-full h-full object-cover relative z-10" />
               ) : (
                 <User className="w-10 h-10 text-muted relative z-10" />
               )}
            </div>
          </div>
          <div className="absolute bottom-2 right-1 w-5 h-5 rounded-full bg-positive border-4 border-canvas-deep" />
        </div>
        <h2 className="font-display text-2xl font-semibold mb-1">{firstName}</h2>
        <p className="text-brand font-medium text-sm">{username}</p>
      </div>
      
      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="text-muted text-[10px] mb-1 font-medium uppercase tracking-wider">{t('turnover')}</div>
            <div className="font-display text-2xl font-semibold flex items-center gap-1.5">
              {Math.floor(turnover).toLocaleString('en-US')} <GramIcon className="w-5 h-5 drop-shadow-md" />
            </div>
          </div>
          <div className="text-right mb-1">
            <button onClick={() => setShowLevelModal(true)} className="text-brand text-xs font-bold active:scale-95 transition-transform">{t('level')} {currentLevel}</button>
            <div className="text-muted text-[10px] flex items-center justify-end gap-1">{isMax ? t('max_level') : `${t('to_next')} ${(levelThreshold - Math.floor(currentLevelProgress)).toLocaleString('en-US')}`} { !isMax && <GramIcon className="w-3 h-3 drop-shadow-md" /> }</div>
          </div>
        </div>
        <div className="group h-2.5 w-full bg-white/5 rounded-full relative drop-shadow-inner border border-white/5 transition-all duration-300 hover:shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:border-gold/30">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${progressPercent}%` }} 
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
              className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] group-hover:brightness-125 transition-all duration-300" 
            />
          </div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
            className="absolute top-0 left-0 bottom-0 bg-amber-400 rounded-full blur-[6px] opacity-0 group-hover:opacity-60 group-hover:animate-pulse transition-opacity duration-500 pointer-events-none"
          />
        </div>
      </div>
      <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="font-display font-semibold">{t('enter_promocode')}</h3>
        <div className="flex gap-2">
          <input 
            value={promoCode} 
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
            placeholder={t('promocode_placeholder')} 
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold text-white placeholder-white/30 uppercase" 
          />
          <button 
            onClick={handleActivatePromo} 
            disabled={isActivating || !promoCode.trim()} 
            className="px-6 py-2.5 bg-brand text-white font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {isActivating ? '...' : t('promo_ok')}
          </button>
        </div>
        {promoStatus && (
          <div className={`text-xs font-bold ${promoStatus.type === 'success' ? 'text-success' : 'text-red-400'}`}>
            {promoStatus.msg}
          </div>
        )}
      </div>

      <div className="glass-panel p-2 rounded-2xl flex flex-col mb-4 space-y-1">
        <button onClick={() => setShowReferrals(true)} className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors rounded-xl group active:scale-95">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="font-semibold text-[15px]">{t('referrals') || 'Referral system'}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
        </button>
        
        <button onClick={() => setShowHistory(true)} className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors rounded-xl group active:scale-95">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <span className="font-semibold text-[15px]">{t('deposit_history') || 'Deposit history'}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
        </button>

        <a href={config?.supportUrl || 'https://t.me/platina_help'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors rounded-xl group active:scale-95">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[15px]">{t('support') || 'Support'}</span>
              <span className="text-xs text-brand font-medium">@platina_help</span>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
        </a>
      </div>

      <AnimatePresence>
        {showReferrals && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowReferrals(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-[8px]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface border border-hairline rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="absolute inset-0 bg-brand/5 blur-3xl pointer-events-none rounded-full" />
              <div className="p-6 pb-4 border-b border-white/5 relative z-10 shrink-0">
                 <h3 className="font-display text-xl font-bold pr-8">{t('referrals')}</h3>
              </div>
              <button onClick={() => setShowReferrals(false)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors z-20">
                <X className="w-4 h-4" />
              </button>
              
              <div className="relative z-10 overflow-y-auto no-scrollbar p-6 pt-4 flex-1">
                <p className="text-white/70 text-sm mb-6 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">{t('referrals_desc')}</p>
                
                <div className="mb-8">
                  <div className="text-sm font-medium text-white/50 mb-2 pl-1">{t('referrals_link')}</div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white/80 overflow-hidden text-ellipsis whitespace-nowrap">
                      {`https://t.me/GaleaDropBot?startapp=r_${user?.id}`}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://t.me/GaleaDropBot?startapp=r_${user?.id}`);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className="w-12 shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-colors text-white"
                    >
                      {isCopied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5 text-white/70" />}
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      const link = `https://t.me/GaleaDropBot?startapp=r_${user?.id}`;
                      const text = t('referrals_desc') || '';
                      (window as any).Telegram?.WebApp?.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
                    }}
                    className="w-full mt-3 py-3 rounded-xl bg-brand/20 text-brand font-bold active:scale-95 transition-transform shadow-lg flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    {t('invite_friends')}
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-display font-semibold text-lg">{t('my_referrals')} <span className="text-white/40 text-sm ml-1 font-medium">{referrals.length}</span></h4>
                  
                  {isLoadingReferrals ? (
                     <div className="flex justify-center py-8">
                        <Activity className="w-6 h-6 text-brand animate-spin" />
                     </div>
                  ) : referrals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 opacity-60 bg-white/5 rounded-2xl border border-white/5">
                      <Users className="w-10 h-10 text-muted mb-3" />
                      <p className="text-sm text-center px-4">{t('no_referrals_yet')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {referrals.map((r) => (
                        <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand/20 overflow-hidden shrink-0 flex items-center justify-center">
                            {r.photoUrl ? (
                              <img src={r.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-brand" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{r.firstName} {r.lastName}</div>
                            <div className="text-xs text-white/50 truncate">
                               {r.username ? `@${r.username}` : t('no_username')}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                             <div className="text-xs text-white/40 mb-0.5">{t('deposited')}</div>
                             <div className="font-bold text-sm text-brand flex items-center justify-end gap-1">
                               {r.topupSum?.toFixed(2) || '0.00'} <GramIcon className="w-3 h-3" />
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      

      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-[8px]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-surface border border-hairline rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="absolute inset-0 bg-brand/5 blur-3xl pointer-events-none rounded-full" />
              <div className="p-6 pb-4 border-b border-white/5 relative z-10 shrink-0">
                 <h3 className="font-display text-xl font-bold pr-8">{t('deposit_history')}</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors z-20">
                <X className="w-4 h-4" />
              </button>
              
              <div className="relative z-10 overflow-y-auto no-scrollbar p-6 pt-4 flex-1">
                {(!topups || topups.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-60">
                    <Wallet className="w-12 h-12 text-muted mb-3" />
                    <p className="text-sm text-center">{t('no_deposits_yet')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {topups.slice().reverse().map((t: any) => (
                      <div key={t.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[13px] text-white/60 mb-1">{new Date(t.ts).toLocaleString('ru-RU')}</span>
                          <span className="text-[15px] font-medium text-white flex items-center gap-1">{t('deposit')}</span>
                        </div>
                        <div className="text-[16px] font-bold text-gold flex items-center gap-1">
                          +{t.amount.toFixed(2)} <GramIcon className="w-4 h-4 drop-shadow-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNft && (() => {
          const currentPrice = Number(selectedNft.price);
          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedNft(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-[8px]"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-surface border border-hairline rounded-2xl p-6 shadow-2xl flex flex-col items-center z-50"
              >
                <div className="w-32 h-32 rounded-2xl mb-4 relative overflow-hidden">
     <PremiumImage staticMode src={selectedNft.image_url || `/nft/${selectedNft.name}.png`} alt={selectedNft.name} className="w-full h-full relative z-10 " />
   </div>
                <h3 className="font-display text-2xl font-semibold text-center mb-1">{selectedNft.name}</h3>
                <p className="text-gold font-medium mb-6 flex items-center justify-center gap-1">{t('value')} {currentPrice.toFixed(2)} <GramIcon className="w-4 h-4 drop-shadow-md" /></p>
                
                <div className="w-full space-y-3">
                  <button 
                    onClick={() => handleSell({ ...selectedNft, price: currentPrice })}
                    disabled={selectedNft.isWithdrawing}
                    className="w-full py-3.5 rounded-xl bg-brand hover:bg-brand-dim disabled:bg-white/10 disabled:text-muted text-white font-semibold transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-1"
                  >
                    {t('sell_for')} {currentPrice.toFixed(2)} <GramIcon className="w-4 h-4 drop-shadow-md" />
                  </button>
                  <button 
                    onClick={() => handleToggleWithdraw(selectedNft)}
                    className={`w-full py-3.5 rounded-xl font-semibold transition-colors border active:scale-95 ${selectedNft.isWithdrawing ? 'bg-danger/10 border-danger/30 text-danger' : 'bg-white/5 border-hairline hover:bg-white/10'}`}
                  >
                    {selectedNft.isWithdrawing ? t('cancel_withdraw') : t('withdraw_nft')}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {showLevelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-[8px]"
            onClick={() => setShowLevelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-hairline p-8 rounded-3xl w-full max-w-sm text-center relative shadow-2xl"
            >
              <button 
                onClick={() => setShowLevelModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-white transition-colors p-2"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 rounded-full bg-brand/20 text-brand flex items-center justify-center mx-auto mb-5">
                <Gift className="w-8 h-8" />
              </div>
              
              <h3 className="font-display text-2xl font-semibold mb-3">{t('level_rewards')}</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                {t('level_prizes_soon')}
              </p>
              
              <button 
                onClick={() => setShowLevelModal(false)}
                className="w-full py-3.5 rounded-xl bg-brand text-white font-semibold active:scale-95 transition-transform shadow-lg"
              >
                {t('got_it')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-[8px]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-surface border border-hairline rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col p-6"
            >
              <h3 className="font-display text-xl font-bold mb-4">{t('settings') || 'Settings'}</h3>
              <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors z-20">
                <X className="w-4 h-4" />
              </button>
              
              <div className="space-y-4">
                <div className="text-sm font-medium text-white/70 mb-2">{t('language') || 'Language'}</div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => { handleSetLang('en'); setShowSettings(false); }} className={`p-3 rounded-xl border flex items-center justify-between ${lang === 'en' ? 'bg-brand/20 border-brand text-brand font-bold' : 'bg-white/5 border-hairline text-white'}`}>
                    English {lang === 'en' && <Gem className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { handleSetLang('ru'); setShowSettings(false); }} className={`p-3 rounded-xl border flex items-center justify-between ${lang === 'ru' ? 'bg-brand/20 border-brand text-brand font-bold' : 'bg-white/5 border-hairline text-white'}`}>
                    Русский {lang === 'ru' && <Gem className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { handleSetLang('zh'); setShowSettings(false); }} className={`p-3 rounded-xl border flex items-center justify-between ${lang === 'zh' ? 'bg-brand/20 border-brand text-brand font-bold' : 'bg-white/5 border-hairline text-white'}`}>
                    中文 {lang === 'zh' && <Gem className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default function App() {
  
  const { t, lang, setLang } = useTranslation();

  const [activeTab, setActiveTab] = useState('shop');
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);

  const [giftsDb, setGiftsDb] = useState<any[]>(defaultGiftsDb);
  const [pricesLoaded, setPricesLoaded] = useState(false);

  useEffect(() => {
    // 1. Fetch our catalog database
    fetch('/api/admin/gifts', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
         const db = (Array.isArray(data) && data.length > 0) ? data : defaultGiftsDb;
         setGiftsDb(db);
         
         // 2. Fetch all real floor prices in a single batch call from kartoshka.free
         fetchFragmentPrices()
             .then((prices) => {
               const bySlug = new Map(prices.map((p) => [p.slug, p]));
               setGiftsDb((prev) =>
                 prev.map((g) => {
                   const p = g.slug ? bySlug.get(g.slug) : undefined;
                   return p && p.floorPriceTon != null ? { ...g, floor_price_gram: p.floorPriceTon } : g;
                 })
               );
             })
             .catch((e) => console.warn('Fragment prices unavailable:', e.message))
             .finally(() => setPricesLoaded(true));
      })
      .catch(() => {
        setGiftsDb(defaultGiftsDb);
        setPricesLoaded(true);
      });
  }, []);

  // Реальная авторизация через Telegram (проверяется на сервере по initData,
  // см. src/lib/useTelegramAuth.ts). Баланс и инвентарь больше не живут
  // только в localStorage браузера — они привязаны к настоящему Telegram-юзеру
  // и подтягиваются с сервера при входе.
  const auth = useTelegramAuth();
  const user = auth.user;
  
  useEffect(() => {
    if (user?.id) {
      setLoggerUserId(user.id);
    }
  }, [user?.id]);
  
  const langInit = useRef(false);
  useEffect(() => {
    if (user?.languageCode && !langInit.current) {
      setLang(user.languageCode as any);
      langInit.current = true;
    }
  }, [user?.languageCode, setLang]);

  const [balance, setBalance] = useState<number>(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [turnover, setTurnover] = useState<number>(0);
  const [topups, setTopups] = useState<any[]>([]);
  const [topUpGlow, setTopUpGlow] = useState(false);
  const [toastMessage, setToastMessage] = useState<{amount: number; method: 'stars'|'ton'}|null>(null);

  const currentLevel = Math.min(100, Math.floor(turnover / 1000) + 1);

  // Как только авторизация готова — заполняем локальное состояние тем,
  // что реально лежит на сервере для этого юзера.
  useEffect(() => {
    if (auth.status === 'ready') {
      setBalance(auth.balance);
      setInventory(auth.inventory.map((i: any, idx: number) => ({...i, uniqueId: i.uniqueId || i.id || `fallback-${idx}-${Date.now()}`})));
      setTurnover(auth.turnover || 0);
      setTopups(auth.topups || []);
      
      const localSeen = localStorage.getItem('welcome_seen') === 'true';
      if (!auth.welcomeSeen && !localSeen) {
        setShowWelcomeScreen(true);
      } else {
        try {
          localStorage.setItem('welcome_seen', 'true');
        } catch (e) {}
      }
    }
  }, [auth.status, auth.welcomeSeen]);

  // Дебаунс-синк изменений баланса/инвентаря на сервер (источник правды).
  useEffect(() => {
    if (auth.status !== 'ready') return;
    const t = setTimeout(() => auth.syncState(balance, inventory, turnover, topups), 600);
    return () => clearTimeout(t);
  }, [balance, inventory, turnover, topups, auth.status]);

  useEffect(() => {
    // @ts-ignore
    if (window.Telegram?.WebApp) {
      // @ts-ignore
      const tg = window.Telegram.WebApp;
      tg.setHeaderColor?.('#050508');
      tg.setBackgroundColor?.('#050508');
    }
  }, []);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoading, setShowLoading] = useState(true);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let interval: any;
    if (showLoading) {
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          const next = prev + (Math.random() * 3 + 1.5);
          return next > 99 ? 99 : next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [showLoading]);

  useEffect(() => {
    if (auth.status !== 'loading' && pricesLoaded && minTimePassed) {
      setLoadingProgress(100);
      const t = setTimeout(() => {
        setShowLoading(false);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [auth.status, pricesLoaded, minTimePassed]);

  const navItems = [
    { id: 'inventory', icon: Package, label: t('my_inventory') || 'Inventory' },
    { id: 'cases', icon: Box, label: t('nav_cases') },
    { id: 'shop', icon: Activity, label: t('nav_shop') },
    { id: 'tasks', icon: ListTodo, label: t('nav_tasks') },
    { id: 'leaderboard', icon: Trophy, label: t('nav_leaderboard') },
    ...(auth.isAdmin ? [{ id: 'admin', icon: Shield, label: t('nav_admin') }] : [])
  ];

  if (showLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-56 h-56 mb-8 flex items-center justify-center relative z-10">
           <CleanModelLottie lottieUrl="https://nft.fragment.com/gift/stellarrocket-1.lottie.json" className="w-full h-full scale-[1.3] drop-shadow-[0_4px_15px_rgba(255,255,255,0.1)]" />
        </div>
        
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mb-2 relative z-10">
          <motion.div 
            className="h-full bg-white rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${loadingProgress}%` }}
            transition={{ ease: "easeOut", duration: 0.2 }}
          />
        </div>
        <div className="text-[10px] text-white/10 font-bold tracking-widest relative z-10">
          {Math.round(loadingProgress)}%
        </div>
        
        <div className="absolute bottom-6 text-[10px] text-white/5 font-bold tracking-widest uppercase z-10 pointer-events-none">
          Platina Gift
        </div>
      </div>
    );
  }

  if (auth.status === 'no_telegram' || auth.status === 'error') {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-3 text-center px-8">
        <h1 className="font-display text-xl font-semibold">Platina Gift</h1>
        <p className="text-white/60 text-sm max-w-xs">
          {auth.status === 'no_telegram'
            ? t('auth_error_no_tg')
            : `${t('auth_error')} ${auth.error}`}
        </p>
      </div>
    );
  }



  if (auth.isMaintenance) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 text-center px-8 relative overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full bg-gold/10 blur-[160px]" />
        
        <div className="w-20 h-20 bg-white/5 rounded-[24px] border border-white/10 flex items-center justify-center mb-2 shadow-2xl relative">
          <div className="absolute inset-0 bg-gold/10 blur-xl rounded-full" />
          <svg className="w-10 h-10 text-gold relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        
        <h1 className="font-display text-2xl font-bold">{t('maintenance_title')}</h1>
        <p className="text-white/50 text-[15px] max-w-[280px] leading-relaxed">
          {t('maintenance_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-[color:var(--color-text)] overflow-hidden selection:bg-brand/30">
      {/* Ambient backdrop: a single soft brand glow + faint grid, not a double-blob gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full bg-brand/10 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, black, transparent 70%)',
          }}
        />
      </div>

      {/* Main Container simulating mobile view bounds on desktop, or full on mobile */}
      <div className="relative z-10 h-[100dvh] w-full max-w-md mx-auto flex flex-col">
        
        {/* Header - Dynamic Island Style */}
        <AnimatePresence>
          {!activeGame && activeTab !== 'profile' && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-x-2 top-2 z-50 flex justify-center pointer-events-none"
            >
              <div className={`relative flex items-center justify-between bg-[#141414]/70 backdrop-blur-[20px] rounded-[32px] p-1.5 w-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto transition-all duration-500 ${
                topUpGlow ? 'border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'border border-white/[0.08]'
              }`}>
                {/* Avatar -> Profile */}
                <button 
                  onClick={() => setActiveTab('profile')} 
                  className="flex items-center gap-2 pr-3 pl-0.5 hover:bg-white/5 rounded-[22px] transition-colors active:scale-95 z-10"
                >
                  <div className="w-[42px] h-[42px] rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)] flex items-center justify-center relative">
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} alt="Avatar" className="absolute w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white/50 relative z-10" />
                    )}
                  </div>
                  <span className="text-[15px] font-bold text-white max-w-[70px] truncate text-left drop-shadow-sm">
                    LVL {currentLevel}
                  </span>
                </button>

                {/* Center Title */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 pointer-events-none whitespace-nowrap z-0">
                  <PremiumImage staticMode={false} loopWithDelay={true} loopDelayMs={0} src="https://nft.fragment.com/gift/heroichelmet-1.lottie.json" alt="Galea Alba" className="w-[32px] h-[32px] object-contain drop-shadow-md" />
                  <span className="text-white font-display font-bold text-[16px] tracking-wide" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.5)' }}>Platina Gift</span>
                </div>

                {/* Balance -> TopUp */}
                <button 
                  onClick={() => setShowTopUp(true)} 
                  className="flex items-center gap-1.5 bg-brand/10 text-brand px-3.5 py-2.5 rounded-[22px] hover:bg-brand/20 active:scale-95 transition-all border border-brand/20 z-10 mr-0.5"
                >
                  <span className="font-display text-[15px] font-bold tracking-wide drop-shadow-md">{balance.toFixed(2)}</span>
                  <GramIcon className="w-[18px] h-[18px] drop-shadow-md" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Content Area */}
        <div className="relative flex-1 w-full overflow-hidden flex flex-col">
          <main className="flex-1 overflow-y-auto pt-[80px] pb-[120px] px-5 scrollbar-hide relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                {activeTab === 'shop' && <Shop onPlayUpgrade={() => setActiveGame('upgrade')} onPlayCraft={() => setActiveGame('craft')} onPlayMines={() => setActiveGame('mines')} onPlayNewGame={() => setActiveGame('new_game')} giftsDb={giftsDb} pricesLoaded={pricesLoaded} />}
                {activeTab === 'leaderboard' && <Leaderboard />}
                {activeTab === 'cases' && <Cases balance={balance} setBalance={setBalance} inventory={inventory} setInventory={setInventory} giftsDb={giftsDb} onAddTurnover={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} turnover={turnover} />}
                {activeTab === 'tasks' && <Tasks onBalanceUpdate={setBalance} />}
                {activeTab === 'profile' && <Profile user={user} inventory={inventory} setInventory={setInventory} balance={balance} setBalance={setBalance} turnover={turnover} topups={topups} onOpenTopUp={() => setShowTopUp(true)} config={auth.config} giftsDb={giftsDb} onBack={() => setActiveTab('shop')} />}
                {activeTab === 'inventory' && <Inventory inventory={inventory} setInventory={setInventory} balance={balance} setBalance={setBalance} turnover={turnover} giftsDb={giftsDb} onGoToCases={() => setActiveTab('cases')} onPlayUpgrade={() => setActiveGame('upgrade')} onPlayCraft={() => setActiveGame('craft')} />}
                {activeTab === 'admin' && <AdminPanel giftsDb={giftsDb} setGiftsDb={(newDb) => {
      setGiftsDb(newDb);
      const token = sessionStorage.getItem('pg_session_token');
      fetch('/api/admin/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ gifts: newDb })
      });
    }} />}
              </motion.div>
            </AnimatePresence>
          </main>

          <AnimatePresence>
            {activeGame === 'upgrade' && (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-[100] bg-black"
              >
                <Upgrade onBack={() => setActiveGame(null)} inventory={inventory} setInventory={setInventory} giftsDb={giftsDb} onWin={(item, price) => auth.recordOpen(item, price, 'nft', undefined, 'upgrade')} balance={balance} setBalance={setBalance} onBet={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} onNavigate={(t) => { setActiveGame(null); setTimeout(() => { if(t==='inventory') setActiveTab('inventory'); else setActiveGame(t as any); }, 50); }} />
              </motion.div>
            )}
            {activeGame === 'craft' && (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-[100] bg-black"
              >
                <Craft onBack={() => setActiveGame(null)} inventory={inventory} setInventory={setInventory} giftsDb={giftsDb} onWin={(item, price) => auth.recordOpen(item, price, 'nft', undefined, 'craft')} onTurnover={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} balance={balance} setBalance={setBalance} onNavigate={(t) => { setActiveGame(null); setTimeout(() => { if(t==='inventory') setActiveTab('inventory'); else setActiveGame(t as any); }, 50); }} />
              </motion.div>
            )}
            {activeGame === 'mines' && (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-[100] bg-black"
              >
                <Mines onBack={() => setActiveGame(null)} inventory={inventory} setInventory={setInventory} balance={balance} setBalance={setBalance} onTurnover={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} onWin={(amt, mode, item, mult) => { if (mode === 'nft' && item) auth.recordOpen(item, amt, 'nft', mult, 'mines'); else if (mode === 'gram') auth.recordOpen(null, amt, 'gram', mult, 'mines'); }} giftsDb={giftsDb} onNavigate={(t) => { setActiveGame(null); setTimeout(() => { if(t==='inventory') setActiveTab('inventory'); else setActiveGame(t as any); }, 50); }} />
              </motion.div>
            )}
            {activeGame === 'new_game' && (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-[100] bg-black"
              >
                <NewGame 
                  onBack={() => setActiveGame(null)} 
                  inventory={inventory} 
                  setInventory={setInventory} 
                  balance={balance} 
                  setBalance={setBalance} 
                  onTurnover={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} 
                  giftsDb={giftsDb} 
                  user={user}
                  token={auth.token}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Liquid Glass Bottom Nav */}
        <AnimatePresence>
          {!activeGame && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute bottom-2 left-0 right-0 z-[90] pb-[calc(env(safe-area-inset-bottom)+12px)] px-3 pt-2 w-full pointer-events-none"
            >
              <div className="pointer-events-auto w-full">
              <nav className="relative flex items-center p-1.5 rounded-[32px] bg-[#141414]/70 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-2 outline-none transition-colors duration-300 ${
                        isActive ? 'text-brand drop-shadow-sm' : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="liquid-pill"
                          className="absolute inset-0 rounded-[28px] bg-brand/15 border border-brand/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] z-0"
                          style={{ borderRadius: 28 }}
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      <motion.div
                        className="relative z-10 flex flex-col items-center justify-center gap-1 will-change-transform"
                        style={{ WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                        animate={{ 
                          scale: isActive ? 1.08 : 1,
                          y: isActive ? -1 : 0 
                        }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      >
                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[9px] font-bold tracking-normal">{item.label}</span>
                      </motion.div>
                    </button>
                  );
                })}
              </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        
        <AnimatePresence>
          {showTopUp && (
            <TopUpModal 
              demoMode={auth.config?.demoMode}
              onClose={() => setShowTopUp(false)} 
              onSuccess={(amount, method, rawAmount) => {
                setBalance(b => b + amount);
                setTopups(prev => [...(prev || []), { id: Date.now().toString(), amount, ts: new Date().toISOString() }]);
                const token = sessionStorage.getItem('pg_session_token');
                if (token) {
                  fetch('/api/bot/notify-topup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ amount })
                  }).catch(console.error);
                }

                // Show visual feedback
                setTopUpGlow(true);
                setToastMessage({ amount: rawAmount, method });
                setTimeout(() => {
                  setTopUpGlow(false);
                  setToastMessage(null);
                }, 3500);
              }} 
            />
          )}
        </AnimatePresence>

        {/* Top-up Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed top-[85px] left-1/2 -translate-x-1/2 z-[200] bg-[#1a1c23] border border-green-500/30 shadow-[0_4px_25px_rgba(34,197,94,0.3)] rounded-2xl p-3 flex items-center gap-3 w-[90%] max-w-sm pointer-events-none"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex flex-shrink-0 items-center justify-center">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-white font-bold text-[14px]">{t('topup_success')}</span>
                <span className="text-white/70 text-[13px] font-medium flex items-center gap-1">
                  +{Number(toastMessage.amount).toFixed(2)} 
                  {toastMessage.method === 'stars' ? (
                    <span className="flex items-center gap-1 text-[#FFD700]"><Star className="w-3.5 h-3.5 fill-current" /> Stars</span>
                  ) : (
                    <span className="flex items-center gap-1 text-brand"><GramIcon className="w-3.5 h-3.5" /> Grams</span>
                  )}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {showWelcomeScreen && (
            <WelcomeScreen onComplete={() => setShowWelcomeScreen(false)} token={auth.token} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
