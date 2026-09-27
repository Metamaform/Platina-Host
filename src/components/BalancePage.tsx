import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowDownLeft, Gem, Wallet, Loader2 } from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { GramIcon } from './GramIcon';
import { StarsIcon } from './StarsIcon';
import { useTranslation } from '../lib/i18n';
import { haptics } from '../lib/haptics';
import { springSnappy } from '../lib/motion';
import { QuickActions } from '../features/wallet/QuickActions';
import { PremiumCardCarousel } from '../features/wallet/PremiumCardCarousel';

/* ---------------------------------------------------------------------------
 * BalancePage — экран кошелька / пополнения:
 * фон как во всём приложении (canvas + мягкое свечение),
 * основная карта BLACK с балансом в граммах и ником пользователя,
 * 2 быстрых действия: Пополнить / Вывод (жидкое стекло; вывод в Gram — скоро).
 * ------------------------------------------------------------------------- */

type TopUpMethod = 'stars' | 'ton' | 'nft';

interface BalancePageProps {
  balance: number;
  /** Ник пользователя для отображения на карте */
  username?: string | null;
  onGoToInventory?: () => void;
  onSuccess: (amount: number, method: 'stars' | 'ton', rawAmount: number) => void;
  onClose: () => void;
  demoMode?: boolean;
  tonTopupAddress?: string;
}

export function BalancePage({
  balance,
  username,
  onSuccess,
  onClose,
  demoMode,
  tonTopupAddress,
}: BalancePageProps) {
  const { t } = useTranslation();
  const [method, setMethod] = useState<TopUpMethod>('stars');
  const topupRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<number | null>(null);

  useEffect(() => () => { if (hintTimer.current) window.clearTimeout(hintTimer.current); }, []);

  const showHint = (msg: string) => {
    setHint(msg);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 2200);
  };

  const tabs: { id: TopUpMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'stars', label: t('stars'), icon: <StarsIcon className="w-4 h-4" /> },
    { id: 'ton', label: 'Gram', icon: <GramIcon className="w-4 h-4 text-brand" /> },
    { id: 'nft', label: 'NFT', icon: <Gem className="w-4 h-4 text-violet-400" /> },
  ];

  return (
    <div className="relative flex flex-col h-full bg-canvas text-[color:var(--color-text)] overflow-hidden">
      {/* Тот же ambient-фон, что и во всём приложении */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full bg-white/[0.07] blur-[160px]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={() => {
            onClose();
            haptics.impact('light');
          }}
          className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF]"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-[22px] font-bold tracking-tight text-white">Кошелёк</h1>
      </div>

      <main aria-label="Кошелёк" className="relative z-10 flex-1 overflow-y-auto scrollbar-hide px-4 pt-2 pb-10 space-y-5 w-full max-w-[720px] mx-auto">
        {/* Основная карта кошелька — BLACK: баланс в граммах + ник */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="motion-reduce:transition-none"
        >
          <PremiumCardCarousel balance={balance} username={username} />
        </motion.div>

        {/* Быстрые действия — Пополнить / Вывод */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: 0.06 }}
        >
          <QuickActions
            onDeposit={() => {
              haptics.impact('light');
              topupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onWithdraw={() => {
              haptics.notification('warning');
              showHint('Скоро будет доступен вывод в Gram');
            }}
          />
        </motion.div>

        {/* Пополнение */}
        <div ref={topupRef} className="scroll-mt-4 pt-2">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/25 text-brand flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4.5 h-4.5" />
            </div>
            <h2 className="font-display text-lg font-bold tracking-tight text-white">{t('topup_title')}</h2>
          </div>

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
                  className={`relative z-10 flex-1 py-2.5 rounded-xl text-[12px] font-bold flex justify-center items-center gap-1.5 transition-colors duration-200 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF] ${
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
            <a
              href="https://t.me/platina_relayer"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptics.impact('light')}
              className="w-full py-3.5 rounded-2xl bg-brand hover:bg-brand-dim text-white font-semibold flex items-center justify-center gap-2 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF]"
            >
              <Gem className="w-5 h-5" />
              {t('topup_nft_button')}
            </a>
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

      </main>

      {/* Toast */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={springSnappy}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[140] px-5 py-2.5 rounded-full bg-[#17171A]/95 backdrop-blur-xl border border-white/[0.08] text-white text-[13px] font-bold tracking-wide shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] pointer-events-none whitespace-nowrap"
            aria-live="polite"
          >
            {hint}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * AmountForm — пополнение Telegram Stars / Gram (TON)
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
  const [starsRate, setStarsRate] = useState(0.95);

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
      setError('Minimum amount - 1 Stars');
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
      if (!tonTopupAddress) {
        setError('TON top-up is not configured. Use Stars.');
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
                <StarsIcon className="w-4 h-4" /> Stars
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 text-[#0098EA]" /> TON
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/5">
          {(method === 'stars' ? ['25', '50', '100', '250'] : ['1', '3', '5', '10']).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                haptics.selection();
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF] ${
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
          role="alert"
        >
          {error}
        </motion.p>
      )}

      <button
        onClick={handleTopUp}
        disabled={loading || gramAmount <= 0}
        className="w-full py-4 rounded-2xl font-bold text-[15px] bg-brand hover:brightness-110 active:scale-[0.98] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex justify-center items-center gap-2 shadow-lg shadow-brand/25 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF]"
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
