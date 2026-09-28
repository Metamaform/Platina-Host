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
import { LiquidSegment } from './ui/LiquidSegment';

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
          className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.12] transition-all active:scale-95 cursor-pointer focus-visible:outline-none"
          aria-label="Назад"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-display text-[20px] font-bold tracking-tight text-white">Кошелёк</h1>
      </div>

      <main aria-label="Кошелёк" className="relative z-10 flex-1 overflow-y-auto scrollbar-hide px-4 pt-2 pb-10 space-y-5 w-full max-w-[720px] mx-auto">
        {/* Основная карта кошелька — BLACK: баланс в граммах + ник */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="motion-reduce:transition-none"
        >
          <PremiumCardCarousel balance={balance} username={username} onHint={showHint} />
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
              haptics.notify('warning');
              showHint('Скоро будет доступен вывод в Gram');
            }}
          />
        </motion.div>

        {/* Пополнение в стиле жидкого стекла */}
        <div ref={topupRef} className="group relative overflow-hidden bg-white/[0.07] backdrop-blur-2xl border border-white/[0.10] rounded-[28px] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03),0_18px_45px_-16px_rgba(0,0,0,0.85)] flex flex-col scroll-mt-4">
          {/* верхнее бликовое свечение жидкого стекла */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-4/5 h-16 rounded-full bg-white/[0.08] blur-2xl opacity-70"
          />

          <div className="relative z-10 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/40 text-brand flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(0,152,234,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-white leading-tight">{t('topup_title')}</h2>
              <p className="text-white/50 text-xs mt-0.5">Stars, Gram или TON</p>
            </div>
          </div>

          <LiquidSegment
            className="relative z-10 mb-4"
            variant="nav"
            ariaLabel="Способ пополнения"
            value={method}
            onChange={(id) => {
              setMethod(id);
              haptics.selection();
            }}
            options={tabs.map((tab) => ({ value: tab.id, label: tab.label, icon: tab.icon }))}
          />

          <div className="relative z-10">
            {method === 'nft' ? (
              <a
                href="https://t.me/platina_relayer"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => haptics.impact('light')}
                className="w-full py-4 rounded-full bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] cursor-pointer"
              >
                <Gem className="w-5 h-5 text-white" />
                <span>{t('topup_nft_button')}</span>
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
      <div className="group relative overflow-hidden flex flex-col items-center justify-center w-full py-8 rounded-[24px] bg-white/[0.05] backdrop-blur-xl border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_35px_-12px_rgba(0,0,0,0.5)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_40%,transparent_60%)]"
        />
        <div className="relative z-10 w-12 h-12 rounded-full bg-brand/20 border border-brand/40 text-brand flex items-center justify-center mb-3 shadow-[0_0_14px_rgba(0,152,234,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]">
          <Wallet className="w-6 h-6 text-brand" />
        </div>
        <p className="relative z-10 text-white/60 text-[13px] text-center font-medium mb-5 px-6 leading-relaxed">
          {t('connect_wallet_to_deposit')}
        </p>
        <div className="relative z-10">
          <TonConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="group relative overflow-hidden w-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.10] rounded-[24px] p-4.5 flex flex-col focus-within:border-brand/40 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_35px_-12px_rgba(0,0,0,0.5)]">
        {/* Specular Top Sheen */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_40%,transparent_60%)]"
        />

        <div className="relative z-10 flex items-center justify-between gap-3">
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
          <div className="text-white font-bold flex items-center gap-1.5 shrink-0 bg-white/[0.08] px-3.5 py-1.5 rounded-full border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] text-xs">
            {method === 'stars' ? (
              <>
                <StarsIcon className="w-4 h-4" /> <span>Stars</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 text-brand" /> <span>TON</span>
              </>
            )}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-4 gap-2 mt-3.5 pt-3.5 border-t border-white/[0.08]">
          {(method === 'stars' ? ['25', '50', '100', '250'] : ['1', '3', '5', '10']).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                haptics.selection();
              }}
              className={`py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer focus-visible:outline-none ${
                amount === preset
                  ? 'bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white border border-cyan-300/40 shadow-[0_0_12px_rgba(0,152,234,0.45)]'
                  : 'bg-white/[0.12] hover:bg-white/[0.18] text-white border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
              }`}
            >
              +{preset}
            </button>
          ))}
        </div>

        <div className="relative z-10 h-px w-full bg-white/[0.08] my-3.5" />

        <div className="relative z-10 flex justify-between items-center">
          <span className="text-white/60 text-[12px] font-medium">{t('you_get')}</span>
          <span className="text-white font-display font-bold flex items-center gap-1.5 text-[15px]">
            <span>+{gramAmount.toFixed(2)}</span> <GramIcon className="w-4 h-4 text-brand drop-shadow-md" />
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
        className="w-full py-4 rounded-full font-display font-bold text-[16px] bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex justify-center items-center gap-2 shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] active:scale-[0.98] cursor-pointer"
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
