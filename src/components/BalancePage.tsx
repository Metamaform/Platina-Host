import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowDownLeft, Star, Gem, Wallet, Loader2, Check, X } from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { GramIcon } from './GramIcon';
import { PremiumImage } from './PremiumImage';
import { useTranslation } from '../lib/i18n';
import { useRates, formatUsd } from '../hooks/useRates';
import { haptics } from '../lib/haptics';
import { springSmooth, springSnappy } from '../lib/motion';

/* ---------------------------------------------------------------------------
 * BalancePage — отдельная страница баланса (не пункт нижнего меню).
 * Открывается по тапу на баланс в шапке.
 * Сверху — карточка «hero» с балансом в GRAM и переводом в долларах,
 * ниже — пополнение в стиле Gram Wallet: Telegram Stars / Gram / NFT.
 * ------------------------------------------------------------------------- */

type TopUpMethod = 'stars' | 'ton' | 'nft';

interface BalancePageProps {
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  inventory: any[];
  setInventory: React.Dispatch<React.SetStateAction<any[]>>;
  onSuccess: (amount: number, method: 'stars' | 'ton', rawAmount: number) => void;
  onClose: () => void;
  demoMode?: boolean;
  /** Project TON address that receives TON top-ups. Empty disables TON top-up. */
  tonTopupAddress?: string;
}

export function BalancePage({
  balance,
  setBalance,
  inventory,
  setInventory,
  onSuccess,
  onClose,
  demoMode,
  tonTopupAddress,
}: BalancePageProps) {
  const { t } = useTranslation();
  const rates = useRates();
  const [method, setMethod] = useState<TopUpMethod>('stars');

  const tabs: { id: TopUpMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'stars', label: t('stars'), icon: <Star className="w-4 h-4 text-[#FFD700] fill-[#FFD700]/30" /> },
    { id: 'ton', label: 'Gram', icon: <GramIcon className="w-4 h-4 text-brand" /> },
    { id: 'nft', label: 'NFT', icon: <Gem className="w-4 h-4 text-violet-400" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-canvas text-[color:var(--color-text)] overflow-hidden">
      {/* Top bar — back + title */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-1 shrink-0">
        <button
          onClick={() => {
            onClose();
            haptics.impact('light');
          }}
          className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-[22px] font-bold tracking-tight text-white">{t('balance')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-2 pb-10 space-y-5">
        {/* ------------------------------------------------------------------
            HERO — карточка баланса: GRAM + перевод в долларах (стиль Gram Wallet)
        ------------------------------------------------------------------- */}
        <div className="hero-gradient rounded-[28px] p-6 text-white relative overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,152,234,0.5)]">
          {/* soft inner glows for material depth */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-black/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-2 text-[11px] font-bold text-white/80 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            {t('balance')}
          </div>

          <div className="relative mt-3 flex items-baseline gap-2">
            <span className="font-display display-xl text-[44px] font-black text-white">
              {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-2xl font-bold text-white/90">GRAM</span>
          </div>

          {/* Перевод в долларах */}
          <div className="relative mt-1 text-[14px] text-white/75 font-medium">
            ≈ {formatUsd(balance, rates.gramUsd)} USD
          </div>

          {/* Live rate chip */}
          <div className="relative mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/10 text-[11px] font-semibold text-white/90">
            <GramIcon className="w-3.5 h-3.5" />
            1 GRAM ≈ ${rates.gramUsd.toFixed(2)}
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Пополнение — Telegram Stars / Gram / NFT (как в Gram Wallet)
        ------------------------------------------------------------------- */}
        <div>
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/25 text-brand flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4.5 h-4.5" />
            </div>
            <h2 className="font-display text-lg font-bold tracking-tight text-white">{t('topup_title')}</h2>
          </div>

          {/* Method segmented control */}
          <div className="w-full flex relative bg-white/[0.04] rounded-2xl p-1 mb-4 border border-white/5">
            {tabs.map((tab) => {
              const active = method === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMethod(tab.id);
                    haptics.selection();
                  }}
                  className={`relative z-10 flex-1 py-2.5 rounded-xl text-[12px] font-bold flex justify-center items-center gap-1.5 transition-colors duration-200 cursor-pointer active:scale-[0.98] ${
                    active ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="balance-topup-tab-pill"
                      className="absolute inset-0 rounded-xl bg-white/10 border border-white/10 shadow-sm z-[-1]"
                      transition={springSnappy}
                    />
                  )}
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {method === 'nft' ? (
            <NftTopUp inventory={inventory} setBalance={setBalance} setInventory={setInventory} />
          ) : (
            <AmountForm
              key={method}
              method={method}
              onSuccess={onSuccess}
              demoMode={demoMode}
              tonTopupAddress={tonTopupAddress}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * AmountForm — пополнение Telegram Stars / Gram (TON).
 * Логика перенесена из TopUpModal: инвойс Stars через бота, TON через TonConnect.
 * ------------------------------------------------------------------------- */
function AmountForm({
  method,
  onSuccess,
  demoMode,
  tonTopupAddress,
}: {
  method: 'stars' | 'ton';
  onSuccess: (amount: number, method: 'stars' | 'ton', rawAmount: number) => void;
  demoMode?: boolean;
  tonTopupAddress?: string;
}) {
  const { t } = useTranslation();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [amount, setAmount] = useState<string>(method === 'stars' ? '50' : '1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [starsRate, setStarsRate] = useState(0.95); // fallback

  useEffect(() => {
    if (method !== 'stars') return;
    fetch('/api/stars-rate')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rate) {
          setStarsRate(data.rate);
        }
      })
      .catch(console.error);
  }, [method]);

  const parsedAmount = Number(amount) || 0;
  const gramAmount = method === 'stars' ? parsedAmount * starsRate : parsedAmount;

  const handleTopUp = async () => {
    if (method === 'stars' && parsedAmount < 1) {
      setError('Minimum amount - 1 stars');
      return;
    } else if (method === 'ton' && parsedAmount <= 0) {
      setError('Enter amount greater than 0');
      return;
    }

    if (demoMode) {
      onSuccess(gramAmount, method, parsedAmount);
      // @ts-ignore
      if (window.Telegram?.WebApp?.showAlert) {
        // @ts-ignore
        window.Telegram.WebApp.showAlert(`Demo top-up ${parsedAmount} successful`);
      }
      return;
    }

    setLoading(true);
    setError('');

    if (method === 'stars') {
      try {
        const res = await fetch('/api/bot/invoice-stars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}`,
          },
          body: JSON.stringify({ stars: parsedAmount }),
        });
        const data = await res.json();
        if (data.invoiceLink) {
          // @ts-ignore
          if (window.Telegram && window.Telegram.WebApp) {
            // @ts-ignore
            const twa = window.Telegram.WebApp;
            if (twa.isVersionAtLeast && twa.isVersionAtLeast('6.1')) {
              twa.openInvoice(data.invoiceLink, (status: string) => {
                if (status === 'paid') {
                  onSuccess(gramAmount, method, parsedAmount);
                } else if (status === 'failed') {
                  setError('Payment failed');
                }
                // 'cancelled' — user closed the invoice, do nothing
              });
            } else if (twa.openTelegramLink) {
              twa.openTelegramLink(data.invoiceLink);
            } else if (twa.openLink) {
              twa.openLink(data.invoiceLink);
            } else {
              window.location.href = data.invoiceLink;
            }
          } else {
            window.location.href = data.invoiceLink;
          }
        } else {
          setError(data.error || 'Error creating invoice');
        }
      } catch (e: any) {
        console.error(e);
        setError('An error occurred while creating invoice');
      } finally {
        setLoading(false);
      }
    } else {
      // TON Logic — send to the configured project top-up address, NOT the
      // user's own wallet (previous bug sent funds back to the sender).
      if (!tonTopupAddress) {
        setError('TON top-up is not configured. Use Telegram Stars.');
        setLoading(false);
        return;
      }
      if (!wallet) return;
      try {
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [
            {
              address: tonTopupAddress,
              amount: (gramAmount * 1e9).toString(),
            },
          ],
        };

        await tonConnectUI.sendTransaction(transaction);
        onSuccess(gramAmount, method, parsedAmount);
      } catch (e: any) {
        console.error(e);
        setError('Transaction cancelled or error occurred');
      } finally {
        setLoading(false);
      }
    }
  };

  if (method === 'ton' && !wallet && !demoMode) {
    return (
      <div className="flex flex-col items-center justify-center w-full py-6 rounded-[24px] bg-white/[0.03] border border-white/[0.06]">
        <div className="w-12 h-12 rounded-2xl bg-[#0098EA]/10 border border-[#0098EA]/20 flex items-center justify-center mb-3">
          <Wallet className="w-6 h-6 text-[#0098EA]" />
        </div>
        <p className="text-white/50 text-[13px] text-center font-medium mb-5 px-6 leading-relaxed">
          {t('connect_wallet_to_deposit')}
        </p>
        <TonConnectButton />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Input Card */}
      <div className="w-full bg-white/[0.04] border border-white/[0.07] rounded-[24px] p-4 flex flex-col focus-within:border-brand/40 transition-colors shadow-inner">
        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              let val = e.target.value;
              if (/^[\d.,]*$/.test(val)) {
                val = val.replace(/,/g, '.');
                if ((val.match(/\./g) || []).length <= 1) {
                  setAmount(val);
                }
              }
            }}
            className="flex-1 bg-transparent text-3xl font-display font-black text-white outline-none min-w-0"
            placeholder={method === 'stars' ? '50' : '1.0'}
          />
          <div className="text-white/70 font-bold flex items-center gap-1.5 shrink-0 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5 text-xs">
            {method === 'stars' ? (
              <>
                <Star className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" /> XTR
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 text-[#0098EA]" /> TON
              </>
            )}
          </div>
        </div>

        {/* Quick Preset Chips */}
        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/5">
          {(method === 'stars' ? ['25', '50', '100', '250'] : ['1', '3', '5', '10']).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                haptics.selection();
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                amount === preset
                  ? 'bg-brand/20 text-brand border border-brand/30'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
              }`}
            >
              +{preset}
            </button>
          ))}
        </div>

        <div className="h-px w-full bg-white/5 my-3" />

        {/* You Get Calculation */}
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-[12px] font-medium">{t('you_get')}</span>
          <span className="text-gold font-display font-bold flex items-center gap-1 text-[15px]">
            +{gramAmount.toFixed(2)} <GramIcon className="w-4 h-4 drop-shadow-md" />
          </span>
        </div>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-rose-400 text-xs font-semibold w-full text-center"
        >
          {error}
        </motion.p>
      )}

      {/* Pay Button */}
      <button
        onClick={handleTopUp}
        disabled={loading || gramAmount <= 0}
        className="w-full py-4 rounded-2xl font-bold text-[15px] bg-brand hover:brightness-110 active:scale-[0.98] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex justify-center items-center gap-2 shadow-lg shadow-brand/25 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t('processing')}</span>
          </>
        ) : (
          <span>{t('pay')}</span>
        )}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * NftTopUp — пополнение баланса NFT: продаём предмет из инвентаря,
 * его стоимость сразу зачисляется на баланс в GRAM.
 * ------------------------------------------------------------------------- */
function NftTopUp({
  inventory,
  setBalance,
  setInventory,
}: {
  inventory: any[];
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  setInventory: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const { t } = useTranslation();
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [soldPrice, setSoldPrice] = useState<number | null>(null);

  const handleSell = (item: any) => {
    const price = Number(item.price) || 0;
    setBalance((prev: number) => Number((prev + price).toFixed(2)));
    setInventory((prev: any[]) => prev.filter((i: any) => i.uniqueId !== item.uniqueId));
    setSelectedNft(null);
    setSoldPrice(price);
    haptics.notify('success');
    setTimeout(() => setSoldPrice(null), 2600);
  };

  return (
    <div>
      {/* Success banner */}
      <AnimatePresence>
        {soldPrice !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springSmooth}
            className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-emerald-400 text-[13px] font-semibold"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            +{soldPrice.toFixed(2)} GRAM
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-white/45 text-[12px] font-medium mb-3 leading-relaxed">{t('topup_nft_desc')}</p>

      {inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-[24px] bg-white/[0.03] border border-white/[0.06]">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
            <Gem className="w-6 h-6 text-violet-400" />
          </div>
          <p className="text-white/50 text-[13px] text-center font-medium px-6">{t('topup_nft_empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {inventory.map((item: any, idx: number) => {
            const price = Number(item.price) || 0;
            const isWithdrawing = !!item.isWithdrawing;
            const image = item.displayImage || item.image_url || (item.name ? `/nft/${item.name}.png` : undefined);
            return (
              <button
                key={item.uniqueId || idx}
                onClick={() => {
                  if (isWithdrawing) return;
                  setSelectedNft(item);
                  haptics.impact('light');
                }}
                disabled={isWithdrawing}
                className={`rounded-[20px] p-3 flex flex-col items-center gap-2 border transition-all active:scale-[0.97] cursor-pointer ${
                  isWithdrawing
                    ? 'bg-white/[0.02] border-white/[0.04] opacity-50 cursor-not-allowed'
                    : 'bg-white/[0.04] border-white/[0.07] hover:border-white/15'
                }`}
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden relative bg-white/[0.04]">
                  <PremiumImage staticMode src={image} alt={item.name || 'NFT'} className="w-full h-full" />
                </div>
                <span className="text-white text-[12px] font-semibold w-full truncate text-center">
                  {item.name || 'NFT'}
                </span>
                <span className="text-gold font-display font-bold text-[13px] flex items-center gap-1">
                  {price.toFixed(2)} <GramIcon className="w-3.5 h-3.5 drop-shadow-md" />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Confirm sell modal */}
      <AnimatePresence>
        {selectedNft && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNft(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-[8px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={springSmooth}
              className="relative w-full max-w-sm bg-surface border border-hairline rounded-[24px] p-6 shadow-2xl flex flex-col items-center z-50"
            >
              <button
                onClick={() => setSelectedNft(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-32 h-32 rounded-2xl mb-4 relative overflow-hidden">
                <PremiumImage
                  staticMode
                  src={selectedNft.displayImage || selectedNft.image_url || (selectedNft.name ? `/nft/${selectedNft.name}.png` : undefined)}
                  alt={selectedNft.name || 'NFT'}
                  className="w-full h-full"
                />
              </div>
              <h3 className="font-display text-2xl font-semibold text-white text-center mb-1">{selectedNft.name}</h3>
              <p className="text-gold font-medium mb-6 flex items-center justify-center gap-1">
                {t('value')} {Number(selectedNft.price || 0).toFixed(2)} <GramIcon className="w-4 h-4 drop-shadow-md" />
              </p>

              <div className="w-full space-y-3">
                <button
                  onClick={() => handleSell(selectedNft)}
                  className="w-full py-3.5 rounded-xl bg-brand hover:bg-brand-dim text-white font-semibold transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                >
                  {t('sell_for')} {Number(selectedNft.price || 0).toFixed(2)} <GramIcon className="w-4 h-4 drop-shadow-md" />
                </button>
                <button
                  onClick={() => setSelectedNft(null)}
                  className="w-full py-3.5 rounded-xl font-semibold transition-colors border bg-white/5 border-hairline hover:bg-white/10 text-white/80 active:scale-95 cursor-pointer"
                >
                  {t('cancel') || 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
