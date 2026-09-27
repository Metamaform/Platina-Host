import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Rocket,
  ChevronRight,
  Copy,
  Check,
  Flame,
  Sparkles,
  Gem,
  Star,
  Clock,
} from 'lucide-react';
import { GramIcon } from './GramIcon';
import { PremiumImage } from './PremiumImage';
import { CleanModelLottie } from './CleanModelLottie';
import { useTranslation } from '../lib/i18n';
import { useRates, formatUsd } from '../hooks/useRates';
import { haptics } from '../lib/haptics';
import { springSmooth } from '../lib/motion';
import { Card, CircleAction, ListRow, Segmented } from './ui/kit';

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

type Segment = 'assets' | 'games' | 'activity';

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
  giftsDb,
}) => {
  const { t, lang } = useTranslation();
  const rates = useRates();
  const [activeSegment, setActiveSegment] = useState<Segment>('assets');
  const [isCopied, setIsCopied] = useState(false);

  const userAddress = user?.id
    ? `EQ${user.id.toString(16).padStart(8, '0')}...${(user.id * 7).toString(16).slice(-4)}`
    : 'EQB...4a9f';

  const copyAddress = () => {
    try {
      navigator.clipboard.writeText(`https://t.me/GaleaDropBot?startapp=r_${user?.id || 'me'}`);
    } catch {}
    setIsCopied(true);
    haptics.notify('success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const inventoryValue = useMemo(
    () => inventory.reduce((acc, item) => acc + (Number(item.price) || 0), 0),
    [inventory]
  );

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

  const transactions = useMemo(() => (topups || []).slice().reverse(), [topups]);

  return (
    <div className="w-full space-y-5 pb-6">
      {/* ------------------------------------------------------------------
          HERO — gradient balance card (GRAM Wallet signature)
      ------------------------------------------------------------------- */}
      <div className="hero-gradient rounded-[28px] p-6 text-white relative overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,152,234,0.5)]">
        {/* soft inner glows for material depth */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-black/20 blur-3xl pointer-events-none" />

        {/* address pill */}
        <div
          onClick={copyAddress}
          className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 transition-all cursor-pointer active:scale-95 select-none border border-white/10"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          <span className="text-[12px] font-mono text-white/90 font-medium">{userAddress}</span>
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-200 ml-0.5" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-white/60 ml-0.5" />
          )}
        </div>

        <div className="relative mt-4 flex items-baseline gap-2">
          <span className="font-display display-xl text-[44px] font-black text-white">
            {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-2xl font-bold text-white/90">GRAM</span>
        </div>
        <div className="relative mt-1 text-[13px] text-white/70 font-medium">
          ≈ {formatUsd(balance, rates.gramUsd)} USD
        </div>
      </div>

      {/* ------------------------------------------------------------------
          Circular actions (GRAM row)
      ------------------------------------------------------------------- */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4 w-full max-w-xs mx-auto -mt-1">
        <CircleAction label={t('topup')} tone="brand" icon={<ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />} onClick={() => { onOpenTopUp(); haptics.impact('light'); }} />
        <CircleAction label={t('send')} icon={<ArrowUpRight className="w-6 h-6 stroke-[2.5]" />} onClick={() => { onOpenSend(); haptics.impact('light'); }} />
        <CircleAction label={t('games')} icon={<Rocket className="w-6 h-6 stroke-[2.2] text-brand" />} onClick={() => { setActiveSegment('games'); haptics.selection(); }} />
        <CircleAction label={t('history')} icon={<History className="w-6 h-6 stroke-[2.2]" />} onClick={() => { setActiveSegment('activity'); haptics.selection(); }} />
      </div>

      {/* ------------------------------------------------------------------
          Segmented tabs
      ------------------------------------------------------------------- */}
      <Segmented<Segment>
        value={activeSegment}
        onChange={(v) => { setActiveSegment(v); haptics.selection(); }}
        options={[
          { value: 'assets', label: t('assets') },
          { value: 'games', label: t('games') },
          { value: 'activity', label: t('history') },
        ]}
      />

      {/* ============================ ASSETS ============================ */}
      {activeSegment === 'assets' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={springSmooth} className="space-y-3">
          <Card className="overflow-hidden divide-y-0">
            <ListRow
              icon={<GramIcon className="w-6 h-6" />}
              iconTone="bg-brand/15 border border-brand/30 text-brand"
              title="Gram"
              subtitle={`1 GRAM ≈ $${rates.gramUsd.toFixed(2)}`}
              onClick={onOpenTopUp}
              right={
                <>
                  <span className="text-white font-display font-bold text-[15px] leading-tight">{balance.toFixed(2)} GRAM</span>
                  <span className="text-muted text-[12px] font-medium mt-0.5">{formatUsd(balance, rates.gramUsd)}</span>
                </>
              }
            />
            <ListRow
              icon={<Star className="w-6 h-6 fill-amber-400 text-amber-400" />}
              iconTone="bg-amber-400/15 border border-amber-400/30 text-amber-400"
              title={t('stars')}
              subtitle={t('topup_balance')}
              onClick={onOpenTopUp}
              right={
                <span className="text-brand text-xs font-bold flex items-center">
                  {t('buy')} <ChevronRight className="w-4 h-4 text-brand" />
                </span>
              }
            />
            <ListRow
              icon={
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 8.5L12 22L21 8.5L12 2Z" /></svg>
              }
              iconTone="bg-brand text-white"
              title="Toncoin"
              subtitle="The Open Network"
              right={
                <span className="text-positive text-xs font-bold bg-positive/10 px-2 py-0.5 rounded-full border border-positive/20">
                  {t('connected')}
                </span>
              }
              last
            />
          </Card>

          {/* NFT collection card */}
          <div
            onClick={onGoToInventory}
            className="p-4 rounded-[24px] bg-surface border border-hairline hover:border-white/20 transition-all cursor-pointer flex flex-col gap-3 group active:scale-[0.99] select-none"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet/30 to-brand/30 border border-violet/30 flex items-center justify-center text-violet shrink-0">
                  <Gem className="w-6 h-6" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-bold text-[15px] leading-tight">{t('collection')}</span>
                  <span className="text-muted text-[12px] font-medium mt-0.5">
                    {inventory.length} · Galea / Fragment
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-display font-bold text-[14px] text-white">{inventoryValue.toFixed(1)} GRAM</span>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
              </div>
            </div>
            {inventory.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-hairline overflow-hidden">
                <div className="flex -space-x-2.5 overflow-hidden py-0.5">
                  {inventory.slice(0, 5).map((item, idx) => (
                    <div key={item.uniqueId || idx} className="w-8 h-8 rounded-full border-2 border-surface bg-surface-2 overflow-hidden flex items-center justify-center relative shrink-0">
                      {item.lottieUrl || item.animation_url ? (
                        <PremiumImage src={item.lottieUrl || item.animation_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Gem className="w-3.5 h-3.5 text-violet" />
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-muted pl-1 truncate">{t('tap_to_view')}</span>
              </div>
            )}
          </div>

          {/* Channel banner */}
          <a
            href="https://t.me/Platina_Gift"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-[24px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
          >
            <img src={getLocalizedImage('subscribe', '/subscribe_nft.jpg')} alt={t('our_telegram')} className="w-full h-auto rounded-[24px]" loading="lazy" decoding="async" />
          </a>
        </motion.div>
      )}

      {/* ============================ GAMES ============================ */}
      {activeSegment === 'games' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={springSmooth} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Crash */}
            <div onClick={onPlayRocket} className="aspect-square rounded-[24px] relative overflow-hidden cursor-pointer group flex flex-col justify-between p-4 bg-gradient-to-b from-surface-2 to-surface border border-amber-500/25 shadow-lg active:scale-[0.98] transition-all hover:border-amber-500/50 select-none">
              <div className="flex items-center justify-between z-10 w-full">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1"><Flame className="w-3 h-3" /> CRASH</span>
                <span className="text-[10px] font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded-full">x100</span>
              </div>
              <div className="flex-1 w-full flex items-center justify-center relative my-1 z-10">
                <div className="w-20 h-20">
                  <CleanModelLottie lottieUrl="/stellarrocket-1-nobg.lottie.json" className="w-full h-full drop-shadow-[0_8px_20px_rgba(245,158,11,0.4)]" />
                </div>
              </div>
              <div className="z-10">
                <h3 className="font-display text-[15px] font-bold text-white leading-tight group-hover:text-amber-300 transition-colors">РАКЕТА</h3>
                <p className="text-[11px] text-white/50 font-medium truncate mt-0.5">{t('crash_desc')}</p>
              </div>
            </div>
            {/* Plinko */}
            <div onClick={onPlayPlinko} className="aspect-square rounded-[24px] relative overflow-hidden cursor-pointer group flex flex-col justify-between p-4 bg-gradient-to-b from-surface-2 to-surface border border-violet/25 shadow-lg active:scale-[0.98] transition-all hover:border-violet/50 select-none">
              <div className="flex items-center justify-between z-10 w-full">
                <span className="px-2.5 py-1 rounded-full bg-violet/15 border border-violet/30 text-violet font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1"><Sparkles className="w-3 h-3" /> NEW</span>
                <span className="text-[10px] font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded-full">x1000</span>
              </div>
              <div className="flex-1 w-full flex items-center justify-center relative my-1 z-10">
                <div className="relative w-16 h-16 flex flex-col items-center justify-center">
                  <div className="flex gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet shadow-[0_0_8px_#7b6cf6]" />
                    <span className="w-2 h-2 rounded-full bg-violet shadow-[0_0_8px_#7b6cf6]" />
                  </div>
                  <div className="flex gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-white/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_10px_#0098ea] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-white/80" />
                  </div>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="w-2 h-2 rounded-full bg-violet" />
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>
                </div>
              </div>
              <div className="z-10">
                <h3 className="font-display text-[15px] font-bold text-white leading-tight group-hover:text-violet transition-colors">PLINKO</h3>
                <p className="text-[11px] text-white/50 font-medium truncate mt-0.5">{t('plinko_desc')}</p>
              </div>
            </div>
          </div>

          <div onClick={onPlayUpgrade} className="rounded-[24px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform border border-hairline">
            <img src={getLocalizedImage('upgrade', '/apgreyd_nft.webp?v=2')} alt={t('upgrade')} className="w-full h-auto rounded-[24px]" loading="lazy" decoding="async" />
          </div>
          <div onClick={onPlayCraft} className="rounded-[24px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform border border-hairline">
            <img src={getLocalizedImage('craft', '/kraft_nft.webp?v=4')} alt={t('craft')} className="w-full h-auto rounded-[24px]" loading="lazy" decoding="async" />
          </div>
          <div onClick={onPlayMines} className="rounded-[24px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform border border-hairline">
            <img src={getLocalizedImage('mines', '/mines_nft.webp?v=5')} alt={t('mines')} className="w-full h-auto rounded-[24px]" loading="lazy" decoding="async" />
          </div>
        </motion.div>
      )}

      {/* ============================ ACTIVITY ============================ */}
      {activeSegment === 'activity' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={springSmooth} className="space-y-3">
          {transactions.length === 0 ? (
            <Card className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <Clock className="w-10 h-10 text-white/30 mb-2" />
              <span className="text-white/80 text-sm font-semibold">{t('empty_history_title')}</span>
              <span className="text-muted text-xs mt-1 max-w-[240px] leading-relaxed">{t('empty_history_desc')}</span>
              <button onClick={() => { onOpenTopUp(); haptics.impact('light'); }} className="mt-4 px-4 py-2 rounded-xl bg-brand hover:brightness-110 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer">
                {t('topup_balance')}
              </button>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {transactions.map((item: any, i: number) => (
                <ListRow
                  key={item.id || i}
                  icon={item.type === 'withdraw' ? <ArrowUpRight className="w-5 h-5 stroke-[2.5]" /> : <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />}
                  iconTone={item.type === 'withdraw' ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' : 'bg-positive/15 border border-positive/30 text-positive'}
                  title={item.type === 'withdraw' ? t('send') : t('topup')}
                  subtitle={new Date(item.ts).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (item.recipient ? ` · ${String(item.recipient).slice(0, 10)}…` : '')}
                  right={
                    <span className={`font-display font-bold text-sm ${item.type === 'withdraw' ? 'text-white/80' : 'text-positive'}`}>
                      {item.type === 'withdraw' ? '-' : '+'}{Number(item.amount).toFixed(2)} GRAM
                    </span>
                  }
                  last={i === transactions.length - 1}
                />
              ))}
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
};
