import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  History, 
  Rocket, 
  ChevronRight, 
  Copy, 
  Check, 
  QrCode, 
  Flame, 
  Sparkles, 
  Box, 
  Layers, 
  Coins, 
  Gem, 
  ExternalLink,
  Star,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { GramIcon } from './GramIcon';
import { PremiumImage } from './PremiumImage';
import { CleanModelLottie } from './CleanModelLottie';
import { cleanNftName } from '../lib/nftUtils';
import { useTranslation } from '../lib/i18n';

interface WalletHomeProps {
  balance: number;
  inventory: any[];
  user: any;
  topups: any[];
  onOpenTopUp: () => void;
  onOpenSend: () => void;
  onPlayRocket: () => void;
  onPlayPlinko: () => void;
  onPlayUpgrade: () => void;
  onPlayCraft: () => void;
  onPlayMines: () => void;
  onGoToCases: () => void;
  onGoToInventory: () => void;
  onOpenSettings: () => void;
  giftsDb: any[];
}

export const WalletHome: React.FC<WalletHomeProps> = ({
  balance,
  inventory,
  user,
  topups,
  onOpenTopUp,
  onOpenSend,
  onPlayRocket,
  onPlayPlinko,
  onPlayUpgrade,
  onPlayCraft,
  onPlayMines,
  onGoToCases,
  onGoToInventory,
  onOpenSettings,
  giftsDb
}) => {
  const { t, lang } = useTranslation();
  const [activeSegment, setActiveSegment] = useState<'assets' | 'games' | 'activity'>('assets');
  const [isCopied, setIsCopied] = useState(false);

  // Address simulation for Telegram TON Wallet
  const userAddress = user?.id 
    ? `EQ${user.id.toString(16).padStart(8, '0')}...${(user.id * 7).toString(16).slice(-4)}`
    : 'EQB...4a9f';

  const copyAddress = () => {
    navigator.clipboard.writeText(`https://t.me/GaleaDropBot?startapp=r_${user?.id || 'me'}`);
    setIsCopied(true);
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Calculate total inventory value
  const inventoryValue = inventory.reduce((acc, item) => acc + (Number(item.price) || 0), 0);

  const getLocalizedImage = (id: string, base: string) => {
    if (lang === 'zh') {
      if (id === 'upgrade') return '/apgreyd_chaina.png?v=2';
      if (id === 'craft') return '/craft_chaina.png?v=2';
      if (id === 'mines') return '/mines_chaina.png?v=2';
      if (id === 'subscribe') return '/subscribe_chaina.png?v=2';
    } else if (lang === 'en') {
      if (id === 'upgrade') return '/upgrade_en.png?v=2';
      if (id === 'craft') return '/craft_en.png?v=2';
      if (id === 'mines') return '/mines_en.png?v=2';
      if (id === 'subscribe') return '/subscribe_en.png?v=2';
    }
    return base;
  };

  return (
    <div className="w-full space-y-5 pb-6">
      {/* 
        ========================================================================
        HERO BALANCE & PRIMARY ACTIONS (wallet.ton.org / Gram Wallet Signature)
        ========================================================================
      */}
      <div className="flex flex-col items-center pt-2 pb-1">
        {/* Address / Account Pill */}
        <div 
          onClick={copyAddress}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#151c27] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer mb-3 active:scale-95 select-none"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[12px] font-mono text-white/70 font-medium">
            {userAddress}
          </span>
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-white/40 ml-0.5" />
          )}
        </div>

        {/* Big Balance Number */}
        <div className="flex items-baseline justify-center gap-2">
          <span className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight">
            {balance.toFixed(2)}
          </span>
          <span className="text-xl sm:text-2xl font-bold text-[#0098EA]">
            GRAM
          </span>
        </div>

        {/* Approximate USD Equivalent */}
        <div className="text-[13px] text-white/45 font-medium mt-1">
          ≈ ${(balance * 0.95).toFixed(2)} USD
        </div>

        {/* 4 Circular Action Buttons (wallet.ton.org exact pattern) */}
        <div className="grid grid-cols-4 gap-3 sm:gap-4 mt-6 w-full max-w-xs">
          {/* 1. Receive / Top-up */}
          <button
            onClick={() => {
              onOpenTopUp();
              try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (e) {}
            }}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-[#0098EA] hover:bg-[#0087d1] active:scale-95 transition-all flex items-center justify-center text-white shadow-lg shadow-[#0098EA]/30">
              <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[12px] font-semibold text-white/80 group-hover:text-white transition-colors">
              Пополнить
            </span>
          </button>

          {/* 2. Send / Transfer */}
          <button
            onClick={() => {
              onOpenSend();
              try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (e) {}
            }}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-[#1b2332] border border-white/10 hover:border-white/20 active:scale-95 transition-all flex items-center justify-center text-white">
              <ArrowUpRight className="w-6 h-6 stroke-[2.5] text-white/90" />
            </div>
            <span className="text-[12px] font-semibold text-white/80 group-hover:text-white transition-colors">
              Отправить
            </span>
          </button>

          {/* 3. Games / Apps */}
          <button
            onClick={() => {
              setActiveSegment('games');
              try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
            }}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-[#1b2332] border border-white/10 hover:border-white/20 active:scale-95 transition-all flex items-center justify-center text-[#0098EA]">
              <Rocket className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[12px] font-semibold text-white/80 group-hover:text-white transition-colors">
              Игры
            </span>
          </button>

          {/* 4. History / Activity */}
          <button
            onClick={() => {
              setActiveSegment('activity');
              try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
            }}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-[#1b2332] border border-white/10 hover:border-white/20 active:scale-95 transition-all flex items-center justify-center text-white">
              <History className="w-6 h-6 stroke-[2.2] text-white/90" />
            </div>
            <span className="text-[12px] font-semibold text-white/80 group-hover:text-white transition-colors">
              История
            </span>
          </button>
        </div>
      </div>

      {/* 
        ========================================================================
        SEGMENTED TABS: АКТИВЫ / ИГРЫ / ИСТОРИЯ (wallet.ton.org style)
        ========================================================================
      */}
      <div className="w-full flex relative bg-[#151c27] p-1 rounded-2xl border border-white/[0.08]">
        <button
          onClick={() => {
            setActiveSegment('assets');
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
          }}
          className={`relative z-10 flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
            activeSegment === 'assets' ? 'text-white' : 'text-white/40 hover:text-white/70'
          }`}
        >
          {activeSegment === 'assets' && (
            <motion.div
              layoutId="wallet-segment-pill"
              className="absolute inset-0 rounded-xl bg-[#222b3a] border border-white/10 shadow-sm z-[-1]"
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            />
          )}
          <span>Активы</span>
        </button>

        <button
          onClick={() => {
            setActiveSegment('games');
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
          }}
          className={`relative z-10 flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
            activeSegment === 'games' ? 'text-white' : 'text-white/40 hover:text-white/70'
          }`}
        >
          {activeSegment === 'games' && (
            <motion.div
              layoutId="wallet-segment-pill"
              className="absolute inset-0 rounded-xl bg-[#222b3a] border border-white/10 shadow-sm z-[-1]"
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            />
          )}
          <span>Игры</span>
        </button>

        <button
          onClick={() => {
            setActiveSegment('activity');
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
          }}
          className={`relative z-10 flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
            activeSegment === 'activity' ? 'text-white' : 'text-white/40 hover:text-white/70'
          }`}
        >
          {activeSegment === 'activity' && (
            <motion.div
              layoutId="wallet-segment-pill"
              className="absolute inset-0 rounded-xl bg-[#222b3a] border border-white/10 shadow-sm z-[-1]"
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            />
          )}
          <span>История</span>
        </button>
      </div>

      {/* 
        ========================================================================
        TAB 1: ASSETS (Активы)
        ========================================================================
      */}
      {activeSegment === 'assets' && (
        <motion.div 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className="bg-[#151c27] border border-white/[0.08] rounded-[24px] overflow-hidden divide-y divide-white/5 shadow-md">
            {/* Asset 1: Gram (GRAM) */}
            <div 
              onClick={onOpenTopUp}
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-[#0098EA]/15 border border-[#0098EA]/30 flex items-center justify-center text-[#0098EA] shrink-0">
                  <GramIcon className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-[15px] leading-tight">Gram</span>
                  <span className="text-white/40 text-[12px] font-medium mt-0.5">1 GRAM ≈ $0.95</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-white font-display font-bold text-[15px] leading-tight">
                  {balance.toFixed(2)} GRAM
                </span>
                <span className="text-white/40 text-[12px] font-medium mt-0.5">
                  ${(balance * 0.95).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Asset 2: Telegram Stars (XTR) */}
            <div 
              onClick={onOpenTopUp}
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Star className="w-6 h-6 fill-amber-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-[15px] leading-tight">Telegram Stars</span>
                  <span className="text-white/40 text-[12px] font-medium mt-0.5">Пополнение баланса</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[#0098EA] text-xs font-bold">
                <span>Купить</span>
                <ChevronRight className="w-4 h-4 text-[#0098EA]" />
              </div>
            </div>

            {/* Asset 3: Toncoin (TON) */}
            <div 
              onClick={onOpenTopUp}
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-[#0098EA] flex items-center justify-center text-white shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L3 8.5L12 22L21 8.5L12 2Z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-[15px] leading-tight">Toncoin</span>
                  <span className="text-white/40 text-[12px] font-medium mt-0.5">The Open Network</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Подключен
                </span>
              </div>
            </div>
          </div>

          {/* NFT Collectibles Portfolio Card */}
          <div 
            onClick={onGoToInventory}
            className="p-4 rounded-[24px] bg-[#151c27] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col gap-3 group active:scale-[0.99] select-none shadow-md"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-[#0098EA]/30 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                  <Gem className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-[15px] leading-tight">
                    Коллекция NFT
                  </span>
                  <span className="text-white/40 text-[12px] font-medium mt-0.5">
                    {inventory.length} {inventory.length === 1 ? 'предмет' : (inventory.length > 1 && inventory.length < 5 ? 'предмета' : 'предметов')} · Galea / Fragment
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[14px] text-white">
                  {inventoryValue.toFixed(1)} GRAM
                </span>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
              </div>
            </div>

            {/* Mini preview row if user has items */}
            {inventory.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 overflow-hidden">
                <div className="flex -space-x-2.5 overflow-hidden py-0.5">
                  {inventory.slice(0, 5).map((item, idx) => (
                    <div 
                      key={item.uniqueId || idx}
                      className="w-8 h-8 rounded-full border-2 border-[#151c27] bg-[#1d2636] overflow-hidden flex items-center justify-center relative shrink-0"
                    >
                      {item.lottieUrl || item.animation_url ? (
                        <PremiumImage 
                          src={item.lottieUrl || item.animation_url} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Gem className="w-3.5 h-3.5 text-violet-400" />
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-white/50 pl-1">
                  Нажмите для просмотра и действий
                </span>
              </div>
            )}
          </div>

          {/* Channel Banner */}
          <a 
            href="https://t.me/Platina_Gift"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-[24px] overflow-hidden cursor-pointer transform-gpu active:scale-[0.99] transition-transform isolate bg-transparent relative border border-white/[0.08]"
          >
            <img 
              src={getLocalizedImage('subscribe', '/subscribe_nft.jpg') || undefined} 
              alt="Subscribe" 
              className="w-full h-auto rounded-[24px]"
            />
          </a>
        </motion.div>
      )}

      {/* 
        ========================================================================
        TAB 2: GAMES (Telegram Web3 Apps & Games Grid)
        ========================================================================
      */}
      {activeSegment === 'games' && (
        <motion.div 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Side-by-side Square Cards: Rocket & Plinko */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Rocket Square Card */}
            <div 
              onClick={onPlayRocket}
              className="aspect-square rounded-[24px] relative overflow-hidden cursor-pointer group flex flex-col justify-between p-4 bg-gradient-to-b from-[#18202d] to-[#121620] border border-amber-500/25 shadow-lg active:scale-[0.98] transition-all hover:border-amber-500/50 select-none"
            >
              <div className="flex items-center justify-between z-10 w-full">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
                  <Flame className="w-3 h-3 text-amber-400" /> CRASH
                </span>
                <span className="text-[10px] font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                  x100
                </span>
              </div>

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

              <div className="z-10 flex flex-col">
                <h3 className="font-display text-[15px] font-bold text-white tracking-wide leading-tight group-hover:text-amber-300 transition-colors">
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
              className="aspect-square rounded-[24px] relative overflow-hidden cursor-pointer group flex flex-col justify-between p-4 bg-gradient-to-b from-[#18202d] to-[#121620] border border-violet-500/25 shadow-lg active:scale-[0.98] transition-all hover:border-violet-500/50 select-none"
            >
              <div className="flex items-center justify-between z-10 w-full">
                <span className="px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-violet-400" /> NEW
                </span>
                <span className="text-[10px] font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                  x1000
                </span>
              </div>

              <div className="flex-1 w-full flex items-center justify-center relative my-1 z-10">
                <div className="w-20 h-20 relative flex items-center justify-center">
                  <div className="relative w-16 h-16 flex flex-col items-center justify-center">
                    <div className="flex gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a855f7]" />
                      <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a855f7]" />
                    </div>
                    <div className="flex gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-white/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_10px_#0098EA] animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-white/80" />
                    </div>
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                      <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_#a855f7]" />
                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="z-10 flex flex-col">
                <h3 className="font-display text-[15px] font-bold text-white tracking-wide leading-tight group-hover:text-violet-300 transition-colors">
                  PLINKO
                </h3>
                <p className="text-[11px] text-white/50 font-medium truncate mt-0.5">
                  Падающие шары
                </p>
              </div>
            </div>
          </div>

          {/* Full Banner Cards for Upgrade, Craft, Mines */}
          <div className="space-y-3">
            {/* Upgrade */}
            <div 
              onClick={onPlayUpgrade}
              className="rounded-[24px] overflow-hidden cursor-pointer group w-full border border-white/[0.08] active:scale-[0.99] transition-transform select-none"
            >
              <img 
                src={getLocalizedImage('upgrade', '/apgreyd_nft.png?v=2')} 
                alt="Upgrade" 
                className="w-full h-auto rounded-[24px]" 
              />
            </div>

            {/* Craft */}
            <div 
              onClick={onPlayCraft}
              className="rounded-[24px] overflow-hidden cursor-pointer group w-full border border-white/[0.08] active:scale-[0.99] transition-transform select-none"
            >
              <img 
                src={getLocalizedImage('craft', '/kraft_nft.png?v=4')} 
                alt="Craft" 
                className="w-full h-auto rounded-[24px]" 
              />
            </div>

            {/* Mines */}
            <div 
              onClick={onPlayMines}
              className="rounded-[24px] overflow-hidden cursor-pointer group w-full border border-white/[0.08] active:scale-[0.99] transition-transform select-none"
            >
              <img 
                src={getLocalizedImage('mines', '/mines_nft.jpg?v=5')} 
                alt="Mines" 
                className="w-full h-auto rounded-[24px]" 
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* 
        ========================================================================
        TAB 3: ACTIVITY (История транзакций)
        ========================================================================
      */}
      {activeSegment === 'activity' && (
        <motion.div 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {(!topups || topups.length === 0) ? (
            <div className="py-12 px-4 text-center rounded-[24px] bg-[#151c27] border border-white/[0.08] flex flex-col items-center justify-center">
              <Clock className="w-10 h-10 text-white/30 mb-2" />
              <span className="text-white/80 text-sm font-semibold">История операций пуста</span>
              <span className="text-white/40 text-xs mt-1 max-w-[240px] leading-relaxed">
                Здесь будут отображаться ваши пополнения, переводы и игровые раунды
              </span>
              <button
                onClick={() => {
                  onOpenTopUp();
                  try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (e) {}
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#0098EA] hover:bg-[#0087d1] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Пополнить баланс
              </button>
            </div>
          ) : (
            <div className="bg-[#151c27] border border-white/[0.08] rounded-[24px] overflow-hidden divide-y divide-white/5 shadow-md">
              {topups.slice().reverse().map((item: any) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      item.type === 'withdraw'
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    }`}>
                      {item.type === 'withdraw' ? (
                        <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm">
                        {item.type === 'withdraw' ? 'Перевод / Вывод' : 'Пополнение счета'}
                      </span>
                      <span className="text-white/40 text-xs mt-0.5">
                        {new Date(item.ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {item.recipient ? ` · ${item.recipient.slice(0, 10)}...` : ''}
                      </span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 font-display font-bold text-sm ${
                    item.type === 'withdraw' ? 'text-white/80' : 'text-emerald-400'
                  }`}>
                    {item.type === 'withdraw' ? '-' : '+'}{Number(item.amount).toFixed(2)} GRAM
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
