import { useTranslation } from '../lib/i18n';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Wallet, Loader2, Star } from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { GramIcon } from './GramIcon';

interface TopUpModalProps {
  onClose: () => void;
  onSuccess: (amount: number, method: 'stars' | 'ton', rawAmount: number) => void;
  demoMode?: boolean;
  /** Project TON address that receives TON top-ups. Empty disables TON top-up. */
  tonTopupAddress?: string;
}

export function TopUpModal({ onClose, onSuccess, demoMode, tonTopupAddress }: TopUpModalProps) {
  const { t } = useTranslation();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [method, setMethod] = useState<'stars' | 'ton'>('stars');
  const [amount, setAmount] = useState<string>('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [starsRate, setStarsRate] = useState(0.95); // fallback

  useEffect(() => {
    fetch('/api/stars-rate')
      .then(res => res.json())
      .then(data => {
        if (data && data.rate) {
          setStarsRate(data.rate);
        }
      })
      .catch(console.error);
  }, []);

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
      onClose();
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
                'Authorization': `Bearer ${sessionStorage.getItem('pg_session_token')}`
            },
            body: JSON.stringify({ stars: parsedAmount })
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
                            onClose();
                        } else if (status === 'failed') {
                            setError('Payment failed');
                        } else if (status === 'cancelled') {
                            // User cancelled
                        }
                    });
                } else if (twa.openTelegramLink) {
                    twa.openTelegramLink(data.invoiceLink);
                    // Polling or manual close might be needed since there is no callback
                    onClose();
                } else if (twa.openLink) {
                    twa.openLink(data.invoiceLink);
                    onClose();
                } else {
                    window.location.href = data.invoiceLink;
                    onClose();
                }
            } else {
                window.location.href = data.invoiceLink;
                onClose();
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
            }
          ]
        };

        await tonConnectUI.sendTransaction(transaction);
        onSuccess(gramAmount, method, parsedAmount);
        onClose();
      } catch (e: any) {
        console.error(e);
        setError('Transaction cancelled or error occurred');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />
      
      {/* Sheet Modal */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="relative z-10 bg-[#14151a] border border-white/10 rounded-t-[32px] sm:rounded-[28px] p-6 pb-8 sm:pb-6 w-full max-w-sm shadow-2xl overflow-hidden flex flex-col text-white"
      >
        {/* Grab Handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/15 active:scale-95 transition-all z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 flex flex-col">
          <h2 className="font-display text-xl font-bold text-white mb-5 text-center tracking-tight">
            {t('topup_title')}
          </h2>

          {/* Segmented Control */}
          <div className="w-full flex relative bg-white/[0.04] rounded-2xl p-1 mb-5 border border-white/5">
            <button
              onClick={() => {
                setMethod('stars');
                try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
              }}
              className={`relative z-10 flex-1 py-2.5 rounded-xl text-[13px] font-bold flex justify-center items-center gap-1.5 transition-colors duration-200 cursor-pointer active:scale-[0.98] ${
                method === 'stars' ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {method === 'stars' && (
                <motion.div
                  layoutId="topup-tab-pill"
                  className="absolute inset-0 rounded-xl bg-white/10 border border-white/10 shadow-sm z-[-1]"
                  transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                />
              )}
              <Star className="w-4 h-4 text-[#FFD700] fill-[#FFD700]/30" /> 
              <span>Telegram Stars</span>
            </button>
            <button
              onClick={() => {
                setMethod('ton');
                try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
              }}
              className={`relative z-10 flex-1 py-2.5 rounded-xl text-[13px] font-bold flex justify-center items-center gap-1.5 transition-colors duration-200 cursor-pointer active:scale-[0.98] ${
                method === 'ton' ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {method === 'ton' && (
                <motion.div
                  layoutId="topup-tab-pill"
                  className="absolute inset-0 rounded-xl bg-white/10 border border-white/10 shadow-sm z-[-1]"
                  transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                />
              )}
              <Wallet className="w-4 h-4 text-[#0098EA]" /> 
              <span>TON</span>
            </button>
          </div>

          <div className="w-full flex flex-col space-y-4">
            {method === 'ton' && !wallet && !demoMode ? (
              <div className="flex flex-col items-center justify-center w-full py-6">
                <div className="w-12 h-12 rounded-2xl bg-[#0098EA]/10 border border-[#0098EA]/20 flex items-center justify-center mb-3">
                  <Wallet className="w-6 h-6 text-[#0098EA]" />
                </div>
                <p className="text-white/50 text-[13px] text-center font-medium mb-5 px-4 leading-relaxed">
                  Подключите кошелек для мгновенного пополнения через блокчейн TON
                </p>
                <TonConnectButton />
              </div>
            ) : (
              <>
                {/* Input Card */}
                <div className="w-full bg-[#181920] border border-white/[0.08] rounded-2xl p-4 flex flex-col focus-within:border-brand/40 transition-colors shadow-inner">
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
                      placeholder={method === 'stars' ? "50" : "1.0"}
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
                          try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
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
                
                {/* Pay Button with Tactile Feedback */}
                <button
                  onClick={handleTopUp}
                  disabled={loading || gramAmount <= 0}
                  className="w-full py-4 rounded-2xl font-bold text-[15px] bg-brand hover:brightness-110 active:scale-[0.98] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex justify-center items-center gap-2 shadow-lg shadow-brand/25 cursor-pointer mt-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Обработка...</span>
                    </>
                  ) : (
                    <span>{t('pay')}</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
