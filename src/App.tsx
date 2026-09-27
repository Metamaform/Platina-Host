import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { setLoggerUserId } from './lib/logger';
import { ShoppingBag, User, Gem, Gift, Wallet, ChevronRight, Activity, CircleDashed, ArrowUpCircle, Shield, LayoutGrid, Trophy, X, ListTodo, Settings, Bomb, Box, Package, ArrowLeft, ArrowUpRight, Users, History, MessageCircle, ExternalLink, Copy, Check, Star, Rocket, Flame, Sparkles } from 'lucide-react';
import defaultGiftsDb from './gifts_data.json';
import { LiveFeed } from './components/LiveFeed';
import { PremiumImage } from './components/PremiumImage';
import { GramIcon } from './components/GramIcon';
import { TopUpModal } from './components/TopUpModal';
import { addTurnover } from './lib/stats';
import { useTelegramAuth } from './lib/useTelegramAuth';
import { useTranslation, i18n } from './lib/i18n';
import { CleanModelLottie } from './components/CleanModelLottie';
import { fetchFragmentPrices, fetchFragmentBackdropPrices } from './lib/api';

// Route-level code splitting: heavy game / panel screens load on demand so the
// initial bundle stays small and the first paint is fast.
const Craft = lazy(() => import('./components/Craft').then((m) => ({ default: m.Craft })));
const Upgrade = lazy(() => import('./components/Upgrade').then((m) => ({ default: m.Upgrade })));
const Mines = lazy(() => import('./components/Mines').then((m) => ({ default: m.Mines })));
const NewGame = lazy(() => import('./components/NewGame').then((m) => ({ default: m.NewGame })));
const Plinko = lazy(() => import('./components/Plinko').then((m) => ({ default: m.Plinko })));
const Cases = lazy(() => import('./components/Cases').then((m) => ({ default: m.Cases })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const Leaderboard = lazy(() => import('./components/Leaderboard').then((m) => ({ default: m.Leaderboard })));
const Tasks = lazy(() => import('./components/Tasks').then((m) => ({ default: m.Tasks })));
const Inventory = lazy(() => import('./components/Inventory').then((m) => ({ default: m.Inventory })));
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen').then((m) => ({ default: m.WelcomeScreen })));

const LazyFallback = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
  </div>
);




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

function Shop({  onPlayUpgrade, onPlayCraft, onPlayMines, onPlayNewGame, onPlayPlinko, giftsDb, pricesLoaded }: { onPlayUpgrade: () => void, onPlayCraft: () => void, onPlayMines: () => void, onPlayNewGame: () => void, onPlayPlinko: () => void, giftsDb: any[], pricesLoaded: boolean }) {
  const { t, lang } = useTranslation();
  const getLocalizedImage = (id: string, base: string) => {
    if (lang === 'zh') {
      if (id === 'upgrade') return '/apgreyd_chaina.webp?v=2';
      if (id === 'craft') return '/craft_chaina.webp?v=2';
      if (id === 'mines') return '/mines_chaina.webp?v=2';
      if (id === 'subscribe') return '/subscribe_chaina.webp?v=2';
    } else if (lang === 'en') {
      if (id === 'upgrade') return '/upgrade_en.webp?v=2';
      if (id === 'craft') return '/craft_en.webp?v=2';
      if (id === 'mines') return '/mines_en.webp?v=2';
      if (id === 'subscribe') return '/subscribe_en.webp?v=2';
    }
    return base;
  };

  const games: { id: string; name: string; description: string; color?: string; badge?: string; image?: string; customIcon?: any; fullCardImage?: string }[] = [
    {
      id: 'upgrade',
      name: t('upgrade'),
      description: t('upgrade_desc'),
      fullCardImage: getLocalizedImage('upgrade', '/apgreyd_nft.webp?v=2'),
      color: 'from-brand/25 via-violet-500/20 to-cyan-500/25',
      badge: t('hot')
    },
    {
      id: 'craft',
      name: t('craft'),
      description: t('craft_desc'),
      fullCardImage: getLocalizedImage('craft', '/kraft_nft.webp?v=4'),
      color: 'from-emerald-500/25 via-teal-500/20 to-green-500/25',
      badge: t('new')
    },
    {
      id: 'mines',
      name: t('mines'),
      description: t('mines_desc'),
      fullCardImage: getLocalizedImage('mines', '/mines_nft.webp?v=5')
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
          src={getLocalizedImage('subscribe', '/subscribe_nft.webp') || undefined} 
          alt="Subscribe" 
          className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.02] rounded-3xl "
        />
      </a>

      <h2 className="font-display text-2xl font-semibold mb-6 px-1 pt-2">{t('popular_games')}</h2>

      {/* Side-by-side Square Cards: Rocket (Crash) & Plinko on the exact same row/level */}
      <div className="grid grid-cols-2 gap-3.5 mb-4">
        {/* Rocket Square Card */}
        <div 
          onClick={onPlayNewGame}
          className="aspect-square rounded-[26px] relative overflow-hidden cursor-pointer group flex flex-col justify-between p-4 bg-gradient-to-b from-[#1c1c24] to-[#121217] border border-amber-500/20 shadow-[0_8px_24px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-all hover:border-amber-500/40"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/25 transition-all" />

          {/* Top Badge & Multiplier */}
          <div className="flex items-center justify-between z-10 w-full">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
              <Flame className="w-3 h-3 text-amber-400" /> CRASH
            </span>
            <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
              x100
            </span>
          </div>

          {/* Center 3D Model / Animation */}
          <div className="flex-1 w-full flex items-center justify-center relative my-1 z-10">
            <div className="w-20 h-20 relative flex items-center justify-center">
              <motion.div
                animate={{ y: [-3, 3, -3], rotate: [42, 48, 42] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="w-full h-full flex items-center justify-center"
              >
                <CleanModelLottie
                  lottieUrl="/stellarrocket-1-nobg.lottie.json"
                  className="w-full h-full drop-shadow-[0_8px_20px_rgba(245,158,11,0.4)]"
                />
              </motion.div>
            </div>
          </div>

          {/* Bottom Texts */}
          <div className="z-10 flex flex-col">
            <h3 className="font-display text-[16px] font-bold text-white tracking-wide leading-tight group-hover:text-amber-300 transition-colors">
              РАКЕТА
            </h3>
            <p className="text-[11px] text-white/50 font-medium truncate mt-0.5">
              Успей забрать
            </p>
          </div>
        </div>

        {/* Plinko Square Card */}
        <div 
          onClick={onPlayPlinko}
          className="aspect-square rounded-[26px] relative overflow-hidden cursor-pointer group flex flex-col justify-between p-4 bg-gradient-to-b from-[#1c1c24] to-[#121217] border border-violet-500/20 shadow-[0_8px_24px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-all hover:border-violet-500/40"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/25 transition-all" />

          {/* Top Badge & Multiplier */}
          <div className="flex items-center justify-between z-10 w-full">
            <span className="px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 text-violet-400" /> NEW
            </span>
            <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
              x1000
            </span>
          </div>

          {/* Center Visual / Animation */}
          <div className="flex-1 w-full flex items-center justify-center relative my-1 z-10">
            <div className="w-20 h-20 relative flex items-center justify-center">
              <motion.div
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                className="w-full h-full flex items-center justify-center relative"
              >
                <div className="relative w-16 h-16 flex flex-col items-center justify-center">
                  <div className="flex gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a855f7]" />
                    <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a855f7]" />
                  </div>
                  <div className="flex gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-white/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_10px_#ffb800] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-white/80" />
                  </div>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                    <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_#a855f7]" />
                    <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom Texts */}
          <div className="z-10 flex flex-col">
            <h3 className="font-display text-[16px] font-bold text-white tracking-wide leading-tight group-hover:text-violet-300 transition-colors">
              PLINKO
            </h3>
            <p className="text-[11px] text-white/50 font-medium truncate mt-0.5">
              Падающие шары
            </p>
          </div>
        </div>
      </div>

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
        {gifts.map((gift, idx) => {
          // Define rarity based on price
          let rarity = { label: t('common'), color: 'text-muted bg-white/5 border-white/15' };
          if (gift.price > 80) rarity = { label: t('legendary'), color: 'text-gold bg-gold/10 border-gold/30' };
          else if (gift.price > 50) rarity = { label: t('epic'), color: 'text-brand bg-brand/10 border-brand/30' };
          else if (gift.price > 20) rarity = { label: t('rare'), color: 'text-sky-300 bg-sky-400/10 border-sky-400/30' };

          return (
            <div key={gift.id} id={`gift-${gift.id}`} className="facet-card glass-panel-interactive rounded-2xl p-3 flex flex-col items-center cursor-pointer group w-full">
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


function Profile({  user, inventory, setInventory, balance, setBalance, turnover, topups, onOpenTopUp, config, giftsDb, onBack, onGoToInventory, onGoToLeaderboard }: { user: any, inventory: any[], setInventory: any, balance: number, setBalance: any, turnover: number, topups: any[], onOpenTopUp: () => void, config?: any, giftsDb?: any[], onBack?: () => void, onGoToInventory?: () => void, onGoToLeaderboard?: () => void }) {
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

  const firstName = user?.firstName || 'Player';
  const username = user?.username ? `@${user.username}` : null;
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
          'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token') || ''}`
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
    <div className="space-y-5 relative pb-8">
      {/* Profile Header */}
      <div className="flex flex-col items-center justify-center pt-2 pb-2 relative">
        <button 
          onClick={() => {
            setShowSettings(true);
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (e) {}
          }} 
          className="absolute top-0 right-0 w-10 h-10 rounded-full bg-white/[0.06] border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95 z-20 cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>
        {onBack && (
          <button 
            onClick={() => {
              onBack();
              try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (e) {}
            }} 
            className="absolute top-0 left-0 w-10 h-10 rounded-full bg-white/[0.06] border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95 z-20 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="relative mb-3 mt-1">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand via-brand/40 to-amber-400 p-[2.5px] shadow-xl shadow-brand/20">
            <div className="w-full h-full rounded-full bg-[#15161b] flex items-center justify-center overflow-hidden relative">
               <div className="absolute inset-0 bg-white/5" />
               {photoUrl ? (
                 <img src={photoUrl || undefined} alt={firstName} className="w-full h-full object-cover relative z-10" />
               ) : (
                 <User className="w-10 h-10 text-muted relative z-10" />
               )}
            </div>
          </div>
          <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-400 border-3 border-[#121316] shadow-sm" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-0.5 tracking-tight">{firstName}</h2>
        {username && (
          <p className="text-brand font-semibold text-xs tracking-wide">{username}</p>
        )}
      </div>
      
      {/* Turnover & Level Card */}
      <div className="bg-[#15161b] border border-white/[0.08] p-5 rounded-[24px] shadow-lg">
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="text-white/40 text-[11px] mb-1 font-bold uppercase tracking-wider">{t('turnover')}</div>
            <div className="font-display text-2xl font-bold flex items-center gap-1.5 text-white">
              {Math.floor(turnover).toLocaleString('en-US')} <GramIcon className="w-5 h-5 drop-shadow-md" />
            </div>
          </div>
          <div className="text-right mb-0.5">
            <button 
              onClick={() => {
                setShowLevelModal(true);
                try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
              }} 
              className="text-brand text-xs font-bold active:scale-95 transition-transform cursor-pointer bg-brand/10 hover:bg-brand/15 px-2.5 py-1 rounded-lg border border-brand/20"
            >
              {t('level')} {currentLevel}
            </button>
            <div className="text-white/40 text-[10px] flex items-center justify-end gap-1 mt-1 font-medium">
              {isMax ? t('max_level') : `${t('to_next')} ${(levelThreshold - Math.floor(currentLevelProgress)).toLocaleString('en-US')}`}
              {!isMax && <GramIcon className="w-3 h-3 drop-shadow-sm" />}
            </div>
          </div>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full relative overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${progressPercent}%` }} 
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.6)]" 
          />
        </div>
      </div>

      {/* Promocode Card */}
      <div className="bg-[#15161b] border border-white/[0.08] rounded-[24px] p-4.5 flex flex-col gap-2.5 shadow-lg">
        <h3 className="font-display text-sm font-bold text-white tracking-wide">{t('enter_promocode')}</h3>
        <div className="flex gap-2">
          <input 
            value={promoCode} 
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
            placeholder={t('promocode_placeholder')} 
            className="flex-1 bg-black/30 border border-white/10 focus:border-brand/40 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-white/25 uppercase outline-none transition-colors" 
          />
          <button 
            onClick={() => {
              handleActivatePromo();
              try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch (e) {}
            }} 
            disabled={isActivating || !promoCode.trim()} 
            className="px-5 py-3 bg-brand hover:brightness-110 text-white font-bold text-sm rounded-xl active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-brand/20 cursor-pointer"
          >
            {isActivating ? '...' : t('promo_ok')}
          </button>
        </div>
        {promoStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs font-semibold ${promoStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {promoStatus.msg}
          </motion.div>
        )}
      </div>

      {/* Menu Action List */}
      <div className="bg-[#15161b] border border-white/[0.08] p-1.5 rounded-[24px] flex flex-col space-y-1 shadow-lg">
        {onGoToInventory && (
          <button 
            onClick={() => {
              onGoToInventory();
              try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
            }} 
            className="flex items-center justify-between p-3.5 hover:bg-white/[0.04] transition-all rounded-2xl group active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-[14px] text-white leading-tight">{t('my_inventory') || 'Мой инвентарь NFT'}</span>
                <span className="text-[11px] text-white/40 mt-0.5">{inventory.length} предметов · вывод и продажа</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>
        )}

        {onGoToLeaderboard && (
          <button 
            onClick={() => {
              onGoToLeaderboard();
              try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
            }} 
            className="flex items-center justify-between p-3.5 hover:bg-white/[0.04] transition-all rounded-2xl group active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-[14px] text-white leading-tight">{t('nav_leaderboard') || 'Таблица лидеров'}</span>
                <span className="text-[11px] text-white/40 mt-0.5">Топ игроков по обороту</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
          </button>
        )}

        <button 
          onClick={() => {
            setShowReferrals(true);
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
          }} 
          className="flex items-center justify-between p-3.5 hover:bg-white/[0.04] transition-all rounded-2xl group active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-[14px] text-white leading-tight">{t('referrals') || 'Реферальная система'}</span>
              <span className="text-[11px] text-white/40 mt-0.5">Приглашай друзей и получай процент</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
        </button>
        
        <button 
          onClick={() => {
            setShowHistory(true);
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
          }} 
          className="flex items-center justify-between p-3.5 hover:bg-white/[0.04] transition-all rounded-2xl group active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-[14px] text-white leading-tight">{t('deposit_history') || 'История пополнений'}</span>
              <span className="text-[11px] text-white/40 mt-0.5">Все транзакции вашего счета</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
        </button>

        <a 
          href={config?.supportUrl || 'https://t.me/platina_help'} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-between p-3.5 hover:bg-white/[0.04] transition-all rounded-2xl group active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-[14px] text-white leading-tight">{t('support') || 'Поддержка'}</span>
              <span className="text-[11px] text-white/40 mt-0.5">Оперативная помощь @platina_help</span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
        </a>
      </div>

      {/* Referrals Modal (Bottom Sheet style) */}
      <AnimatePresence>
        {showReferrals && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowReferrals(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative z-10 w-full max-w-md bg-[#14151a] border border-white/10 rounded-t-[32px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white"
            >
              {/* Grab Handle */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

              <div className="p-5 pb-3 border-b border-white/5 flex items-center justify-between shrink-0">
                 <div>
                   <h3 className="font-display text-lg font-bold tracking-tight">{t('referrals')}</h3>
                   <p className="text-white/40 text-xs mt-0.5">Приглашайте друзей и получайте вознаграждение</p>
                 </div>
                 <button 
                   onClick={() => setShowReferrals(false)} 
                   className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
                 >
                   <X className="w-4 h-4" />
                 </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar p-5 pt-4 flex-1 space-y-5">
                <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                  <p className="text-white/70 text-xs leading-relaxed">{t('referrals_desc')}</p>
                </div>
                
                <div>
                  <span className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                    {t('referrals_link')}
                  </span>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-3 text-xs font-mono font-medium text-white/80 overflow-hidden text-ellipsis whitespace-nowrap">
                      {`https://t.me/GaleaDropBot?startapp=r_${user?.id}`}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://t.me/GaleaDropBot?startapp=r_${user?.id}`);
                        setIsCopied(true);
                        try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className="px-3.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl flex items-center justify-center transition-all text-white cursor-pointer"
                    >
                      {isCopied ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                          <Check className="w-4 h-4" />
                          <span>Скопировано</span>
                        </div>
                      ) : (
                        <Copy className="w-4 h-4 text-white/70" />
                      )}
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      const link = `https://t.me/GaleaDropBot?startapp=r_${user?.id}`;
                      const text = t('referrals_desc') || '';
                      try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch (e) {}
                      (window as any).Telegram?.WebApp?.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
                    }}
                    className="w-full mt-3 py-3.5 rounded-xl bg-brand hover:brightness-110 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>{t('invite_friends')}</span>
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-bold text-sm tracking-wide text-white">
                      {t('my_referrals')}
                    </h4>
                    <span className="text-white/40 text-xs font-semibold bg-white/5 px-2 py-0.5 rounded-full">
                      {referrals.length}
                    </span>
                  </div>
                  
                  {isLoadingReferrals ? (
                     <div className="flex justify-center py-8">
                        <Activity className="w-6 h-6 text-brand animate-spin" />
                     </div>
                  ) : referrals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 opacity-60 bg-white/[0.02] rounded-2xl border border-white/5">
                      <Users className="w-8 h-8 text-white/30 mb-2" />
                      <p className="text-xs text-center text-white/50 px-4">{t('no_referrals_yet')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {referrals.map((r) => (
                        <div key={r.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand/20 overflow-hidden shrink-0 flex items-center justify-center border border-brand/30">
                            {r.photoUrl ? (
                              <img src={r.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-brand" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs text-white truncate">{r.firstName} {r.lastName}</div>
                            <div className="text-[11px] text-white/40 truncate">
                               {r.username ? `@${r.username}` : t('no_username')}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                             <div className="text-[10px] text-white/40 mb-0.5">{t('deposited')}</div>
                             <div className="font-bold text-xs text-gold flex items-center justify-end gap-1">
                               +{r.topupSum?.toFixed(2) || '0.00'} <GramIcon className="w-3 h-3" />
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

      {/* Deposit History Modal (Bottom Sheet style) */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative z-10 w-full max-w-sm bg-[#14151a] border border-white/10 rounded-t-[32px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-white"
            >
              {/* Grab Handle */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

              <div className="p-5 pb-3 border-b border-white/5 flex items-center justify-between shrink-0">
                 <div>
                   <h3 className="font-display text-lg font-bold tracking-tight">{t('deposit_history')}</h3>
                   <p className="text-white/40 text-xs mt-0.5">История входящих платежей</p>
                 </div>
                 <button 
                   onClick={() => setShowHistory(false)} 
                   className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
                 >
                   <X className="w-4 h-4" />
                 </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar p-5 pt-4 flex-1">
                {(!topups || topups.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-60">
                    <Wallet className="w-10 h-10 text-white/30 mb-2" />
                    <p className="text-xs text-white/50 text-center">{t('no_deposits_yet')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {topups.slice().reverse().map((tx: any) => (
                      <div key={tx.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-white/40 mb-0.5 font-medium">{new Date(tx.ts).toLocaleString('ru-RU')}</span>
                          <span className="text-[13px] font-semibold text-white flex items-center gap-1">{t('deposit')}</span>
                        </div>
                        <div className="text-[14px] font-bold text-gold flex items-center gap-1 font-display">
                          +{Number(tx.amount || 0).toFixed(2)} <GramIcon className="w-3.5 h-3.5 drop-shadow-md" />
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
                {selectedNft.backdrop === 'Onyx Black' ? (
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r from-neutral-900 to-black text-amber-300 border border-amber-500/40 mb-2">
                    Onyx Black
                  </span>
                ) : selectedNft.backdrop === 'Black' ? (
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-zinc-950 text-zinc-200 border border-zinc-700/80 mb-2">
                    Black
                  </span>
                ) : null}
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
    const loadPrices = () => {
      // 1. Fetch our catalog database
      fetch('/api/admin/gifts', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
           const db = (Array.isArray(data) && data.length > 0) ? data : defaultGiftsDb;
           setGiftsDb(db);
           
           // 2. Fetch all real floor prices and backdrop prices in batch calls from kartoshka.free
           Promise.allSettled([
             fetchFragmentPrices(),
             fetchFragmentBackdropPrices()
           ])
             .then(([pricesRes, backdropsRes]) => {
               const prices = pricesRes.status === 'fulfilled' ? pricesRes.value : [];
               const backdrops = backdropsRes.status === 'fulfilled' ? backdropsRes.value : {};
               const bySlug = new Map(prices.map((p) => [(p.slug || '').toLowerCase(), p]));

               setGiftsDb((prev) =>
                 prev.map((g) => {
                   const sLower = (g.slug || '').toLowerCase();
                   const baseP = bySlug.get(sLower);
                   const bInfo = backdrops[sLower];

                   if (g.backdrop === 'Black') {
                     if (bInfo && bInfo.blackTon > 0) {
                       return { ...g, floor_price_gram: bInfo.blackTon };
                     } else if (baseP && baseP.floorPriceTon != null && bInfo?.blackMult) {
                       return { ...g, floor_price_gram: Number((baseP.floorPriceTon * bInfo.blackMult).toFixed(2)) };
                     }
                     return g;
                   } else if (g.backdrop === 'Onyx Black') {
                     if (bInfo && bInfo.onyxTon > 0) {
                       return { ...g, floor_price_gram: bInfo.onyxTon };
                     } else if (baseP && baseP.floorPriceTon != null && bInfo?.onyxMult) {
                       return { ...g, floor_price_gram: Number((baseP.floorPriceTon * bInfo.onyxMult).toFixed(2)) };
                     }
                     return g;
                   } else {
                     return baseP && baseP.floorPriceTon != null ? { ...g, floor_price_gram: baseP.floorPriceTon } : g;
                   }
                 })
               );
             })
             .catch((e) => console.warn('Variant prices unavailable:', e.message))
             .finally(() => setPricesLoaded(true));
        })
        .catch(() => {
          setGiftsDb(defaultGiftsDb);
          setPricesLoaded(true);
        });
    };

    loadPrices();

    // Pull floor prices for all NFTs (including Black and Onyx Black) every 3 hours (3 * 60 * 60 * 1000)
    const interval = setInterval(loadPrices, 3 * 60 * 60 * 1000);
    return () => clearInterval(interval);
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
  const [toastMessage, setToastMessage] = useState<{amount: number; method: 'stars'|'ton'; type?: 'topup'|'withdraw'; title?: string}|null>(null);
  const isInitializedRef = useRef(false);

  const currentLevel = Math.min(100, Math.floor(turnover / 1000) + 1);

  // Как только авторизация готова — заполняем локальное состояние тем,
  // что реально лежит на сервере для этого юзера.
  useEffect(() => {
    if (auth.status === 'ready') {
      setBalance(auth.balance);
      setInventory(auth.inventory.map((i: any, idx: number) => ({...i, uniqueId: i.uniqueId || i.id || `fallback-${idx}-${Date.now()}`})));
      setTurnover(auth.turnover || 0);
      setTopups(auth.topups || []);
      isInitializedRef.current = true;
      
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
    if (auth.status !== 'ready' || !isInitializedRef.current) return;
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
    { id: 'shop', icon: Flame, label: t('nav_shop') || 'Игры' },
    { id: 'cases', icon: Box, label: t('nav_cases') || 'Кейсы' },
    { id: 'tasks', icon: ListTodo, label: t('nav_tasks') || 'Задания' },
    { id: 'profile', icon: User, label: 'Профиль' },
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
      {/* Clean ambient backdrop: soft neutral glow, no grid squares */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full bg-white/[0.07] blur-[160px]" />
      </div>

      {/* Main Container simulating mobile view bounds on desktop, or full on mobile */}
      <div className="relative z-10 h-[100dvh] w-full max-w-md mx-auto flex flex-col">
        
        {/* Header - Dynamic Island */}
        <AnimatePresence>
          {!activeGame && activeTab !== 'profile' && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="absolute inset-x-3 top-2.5 z-50 flex justify-center pointer-events-none"
            >
                <div className={`relative flex items-center justify-between bg-[#131418]/85 backdrop-blur-2xl rounded-[32px] p-1.5 w-full shadow-[0_12px_36px_rgba(0,0,0,0.6)] pointer-events-auto transition-all duration-300 ${
                  topUpGlow ? 'border border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.35)]' : 'border border-white/[0.08]'
                }`}>
                  {/* Avatar -> Profile */}
                  <button 
                    onClick={() => {
                      setActiveTab('profile');
                      try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
                    }} 
                    className="flex items-center gap-2 pr-2.5 pl-1 py-0.5 hover:bg-white/5 rounded-full transition-all active:scale-[0.96] z-10 cursor-pointer"
                  >
                    <div className="w-[38px] h-[38px] rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.08)] flex items-center justify-center relative">
                      {user?.photoUrl ? (
                        <img src={user.photoUrl} alt="Avatar" className="absolute w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-white/50 relative z-10" />
                      )}
                    </div>
                    <span className="text-[12px] font-bold text-white/90 bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/5">
                      LVL {currentLevel}
                    </span>
                  </button>

                  {/* Center NFT Heroic Helmet (Model: Galea Alba) */}
                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-0">
                    <PremiumImage 
                      staticMode={false} 
                      loopWithDelay={true} 
                      loopDelayMs={0} 
                      src="https://nft.fragment.com/gift/heroichelmet-127.lottie.json" 
                      alt="Heroic Helmet - Galea Alba" 
                      className="w-[62px] h-[62px] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)]" 
                    />
                  </div>

                  {/* Balance -> TopUp */}
                  <button 
                    onClick={() => {
                      setShowTopUp(true);
                      try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (e) {}
                    }} 
                    className="flex items-center gap-1.5 bg-brand/15 text-brand px-3 py-1.5 rounded-full hover:bg-brand/20 active:scale-[0.96] transition-all duration-150 border border-brand/25 z-10 mr-0.5 cursor-pointer shadow-sm"
                  >
                    <span className="font-display text-[14px] font-bold tracking-tight text-white">{balance.toFixed(2)}</span>
                    <GramIcon className="w-4 h-4 text-brand" />
                    <span className="w-4 h-4 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center ml-0.5 leading-none">
                      +
                    </span>
                  </button>
                </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Content Area */}
        <div className="relative flex-1 w-full overflow-hidden flex flex-col">
          <main className="flex-1 overflow-y-auto pt-[76px] pb-[120px] px-4.5 scrollbar-hide relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                {activeTab === 'shop' && (
                  <Shop 
                    onPlayUpgrade={() => setActiveGame('upgrade')} 
                    onPlayCraft={() => setActiveGame('craft')} 
                    onPlayMines={() => setActiveGame('mines')} 
                    onPlayNewGame={() => setActiveGame('new_game')} 
                    onPlayPlinko={() => setActiveGame('plinko')}
                    giftsDb={giftsDb} 
                    pricesLoaded={pricesLoaded} 
                  />
                )}
                {activeTab === 'leaderboard' && <Suspense fallback={<LazyFallback />}><Leaderboard /></Suspense>}
                {activeTab === 'cases' && <Suspense fallback={<LazyFallback />}><Cases balance={balance} setBalance={setBalance} inventory={inventory} setInventory={setInventory} giftsDb={giftsDb} onAddTurnover={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} turnover={turnover} /></Suspense>}
                {activeTab === 'tasks' && <Suspense fallback={<LazyFallback />}><Tasks onBalanceUpdate={setBalance} /></Suspense>}
                {activeTab === 'profile' && (
                  <Profile 
                    user={user} 
                    inventory={inventory} 
                    setInventory={setInventory} 
                    balance={balance} 
                    setBalance={setBalance} 
                    turnover={turnover} 
                    topups={topups} 
                    onOpenTopUp={() => setShowTopUp(true)} 
                    config={auth.config} 
                    giftsDb={giftsDb} 
                    onBack={() => setActiveTab('shop')}
                    onGoToInventory={() => setActiveTab('inventory')}
                    onGoToLeaderboard={() => setActiveTab('leaderboard')}
                  />
                )}
                {activeTab === 'inventory' && (
                  <Suspense fallback={<LazyFallback />}>
                    <Inventory 
                      inventory={inventory} 
                      setInventory={setInventory} 
                      balance={balance} 
                      setBalance={setBalance} 
                      turnover={turnover} 
                      giftsDb={giftsDb} 
                      onGoToCases={() => setActiveTab('cases')} 
                      onPlayUpgrade={() => setActiveGame('upgrade')} 
                      onPlayCraft={() => setActiveGame('craft')} 
                      onBack={() => setActiveTab('shop')}
                    />
                  </Suspense>
                )}
                {activeTab === 'admin' && <Suspense fallback={<LazyFallback />}><AdminPanel giftsDb={giftsDb} setGiftsDb={(newDb) => {
      setGiftsDb(newDb);
      const token = sessionStorage.getItem('pg_session_token');
      fetch('/api/admin/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ gifts: newDb })
      });
    }} /></Suspense>}
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
                <Suspense fallback={<LazyFallback />}><Upgrade onBack={() => setActiveGame(null)} inventory={inventory} setInventory={setInventory} giftsDb={giftsDb} onWin={(item, price) => auth.recordOpen(item, price, 'nft', undefined, 'upgrade')} balance={balance} setBalance={setBalance} onBet={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} onNavigate={(t) => { setActiveGame(null); setTimeout(() => { if(t==='inventory') setActiveTab('inventory'); else setActiveGame(t as any); }, 50); }} /></Suspense>
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
                <Suspense fallback={<LazyFallback />}><Craft onBack={() => setActiveGame(null)} inventory={inventory} setInventory={setInventory} giftsDb={giftsDb} onWin={(item, price) => auth.recordOpen(item, price, 'nft', undefined, 'craft')} onTurnover={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} balance={balance} setBalance={setBalance} onNavigate={(t) => { setActiveGame(null); setTimeout(() => { if(t==='inventory') setActiveTab('inventory'); else setActiveGame(t as any); }, 50); }} /></Suspense>
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
                <Suspense fallback={<LazyFallback />}><Mines onBack={() => setActiveGame(null)} inventory={inventory} setInventory={setInventory} balance={balance} setBalance={setBalance} onTurnover={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} onWin={(amt, mode, item, mult) => { if (mode === 'nft' && item) auth.recordOpen(item, amt, 'nft', mult, 'mines'); else if (mode === 'gram') auth.recordOpen(null, amt, 'gram', mult, 'mines'); }} giftsDb={giftsDb} onNavigate={(t) => { setActiveGame(null); setTimeout(() => { if(t==='inventory') setActiveTab('inventory'); else setActiveGame(t as any); }, 50); }} /></Suspense>
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
                <Suspense fallback={<LazyFallback />}>
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
                </Suspense>
              </motion.div>
            )}
            {activeGame === 'plinko' && (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-[100] bg-black"
              >
                <Suspense fallback={<LazyFallback />}>
                <Plinko 
                  onBack={() => setActiveGame(null)} 
                  inventory={inventory} 
                  setInventory={setInventory} 
                  balance={balance} 
                  setBalance={setBalance} 
                  onTurnover={(amount) => { setTurnover(prev => prev + amount); addTurnover(amount); }} 
                  onWin={(amt, mode, item, mult) => {
                    if (mode === 'nft' && item) auth.recordOpen(item, amt, 'nft', mult, 'plinko');
                    else if (mode === 'gram') auth.recordOpen(null, amt, 'gram', mult, 'plinko');
                  }}
                  giftsDb={giftsDb} 
                  user={user}
                  token={auth.token}
                />
                </Suspense>
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
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="absolute bottom-2.5 left-0 right-0 z-[90] pb-[calc(env(safe-area-inset-bottom,0px)+10px)] px-3 w-full pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-sm mx-auto">
              <nav className="relative flex items-center p-1.5 rounded-[30px] bg-[#14151a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_45px_-10px_rgba(0,0,0,0.7)]">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
                      }}
                      className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-2 outline-none transition-colors duration-200 active:scale-[0.93] cursor-pointer ${
                        isActive ? 'text-brand' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="liquid-pill"
                          className="absolute inset-0 rounded-[24px] bg-brand/15 border border-brand/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] z-0"
                          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        />
                      )}
                      <motion.div
                        className="relative z-10 flex flex-col items-center justify-center gap-1 will-change-transform"
                        style={{ WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                        animate={{ 
                          scale: isActive ? 1.05 : 1,
                          y: isActive ? -0.5 : 0 
                        }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                      >
                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
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
              tonTopupAddress={auth.config?.tonTopupAddress}
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

                // Visual and haptic feedback
                setTopUpGlow(true);
                setToastMessage({ amount: rawAmount, method });
                try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
                setTimeout(() => {
                  setTopUpGlow(false);
                  setToastMessage(null);
                }, 3500);
              }} 
            />
          )}
        </AnimatePresence>


        {/* Toast Notification (Sonner style for top-up & send) */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.94 }}
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
              className={`fixed top-5 left-1/2 -translate-x-1/2 z-[250] bg-[#14151a]/95 backdrop-blur-2xl border shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 w-auto min-w-[280px] max-w-sm pointer-events-none ${
                toastMessage.type === 'withdraw'
                  ? 'border-blue-500/30 shadow-[0_16px_40px_rgba(0,152,234,0.25)]'
                  : 'border-emerald-500/30 shadow-[0_16px_40px_rgba(16,185,129,0.25)]'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex flex-shrink-0 items-center justify-center ${
                toastMessage.type === 'withdraw'
                  ? 'bg-[#0098EA]/20 border border-[#0098EA]/30 text-[#0098EA]'
                  : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
              }`}>
                {toastMessage.type === 'withdraw' ? (
                  <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-white font-bold text-[13px] leading-tight">
                  {toastMessage.type === 'withdraw' ? (toastMessage.title || 'Перевод отправлен') : t('topup_success')}
                </span>
                <span className="text-white/70 text-[12px] font-medium flex items-center gap-1 mt-0.5">
                  {toastMessage.type === 'withdraw' ? '-' : '+'}{Number(toastMessage.amount).toFixed(2)} 
                  {toastMessage.method === 'stars' ? (
                    <span className="flex items-center gap-1 text-[#FFD700] font-bold"><Star className="w-3.5 h-3.5 fill-current" /> Stars</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[#0098EA] font-bold"><GramIcon className="w-3.5 h-3.5 text-[#0098EA]" /> Grams</span>
                  )}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {showWelcomeScreen && (
            <Suspense fallback={null}><WelcomeScreen onComplete={() => setShowWelcomeScreen(false)} token={auth.token} /></Suspense>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
