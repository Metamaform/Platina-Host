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
}

export function TopUpModal({ onClose, onSuccess, demoMode }: TopUpModalProps) {
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
        window.Telegram.WebApp.showAlert(`Демо-пополнение на ${parsedAmount} successful!`);
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
      // TON Logic
      if (!wallet) return;
      try {
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [
            {
              address: wallet.account.address, 
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-[#1a1c23] border border-white/5 rounded-[28px] p-6 w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 flex flex-col pt-2">
          <h2 className="font-display text-xl font-bold text-white mb-6 text-center">{t('topup_title')}</h2>

          <div className="w-full flex relative bg-white/5 rounded-xl p-1 mb-6 border border-white/5">
            <button
              onClick={() => setMethod('stars')}
              className={`relative z-10 flex-1 py-2.5 rounded-lg text-[13px] font-bold flex justify-center items-center gap-1.5 transition-colors duration-300 ${
                method === 'stars' ? 'text-white' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {method === 'stars' && (
                <motion.div
                  layoutId="topup-tab-pill"
                  className="absolute inset-0 rounded-lg bg-white/10 shadow-sm z-[-1]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Star className="w-4 h-4 text-[#FFD700]" /> 
              <span>Telegram Stars</span>
            </button>
            <button
              onClick={() => setMethod('ton')}
              className={`relative z-10 flex-1 py-2.5 rounded-lg text-[13px] font-bold flex justify-center items-center gap-1.5 transition-colors duration-300 ${
                method === 'ton' ? 'text-white' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {method === 'ton' && (
                <motion.div
                  layoutId="topup-tab-pill"
                  className="absolute inset-0 rounded-lg bg-white/10 shadow-sm z-[-1]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Wallet className="w-4 h-4 text-[#0098EA]" /> 
              <span>TON</span>
            </button>
          </div>

          <div className="w-full flex flex-col space-y-4 min-h-[210px]">
            {method === 'ton' && !wallet && !demoMode ? (
              <div className="flex-1 flex flex-col items-center justify-center w-full">
                <p className="text-white/40 text-[13px] text-center font-medium mb-6 px-4">Connect wallet to top-up balance via TON</p>
                <TonConnectButton />
              </div>
            ) : (
              <>
                <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center gap-3">
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
                      className="flex-1 bg-transparent text-3xl font-black text-white outline-none"
                      placeholder={method === 'stars' ? "1" : "0.0"}
                    />
                    <div className="text-white/50 font-bold flex items-center gap-1.5">
                      {method === 'stars' ? (
                        <>
                          <Star className="w-5 h-5 text-[#FFD700]" /> XTR
                        </>
                      ) : (
                        'TON'
                      )}
                    </div>
                  </div>
                  <div className="h-px w-full bg-white/5 my-4" />
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-[13px] font-medium">{t('you_get')}</span>
                    <span className="text-gold font-bold flex items-center gap-1 text-[15px]">
                      {gramAmount.toFixed(2)} <GramIcon className="w-4 h-4 drop-shadow-md" />
                    </span>
                  </div>
                </div>
                
                {error && <p className="text-red-400 text-xs font-bold w-full text-center">{error}</p>}
                
                <button
                  onClick={handleTopUp}
                  disabled={loading || gramAmount <= 0}
                  className="w-full py-4 rounded-xl font-bold text-[15px] bg-[#3b82f6] hover:bg-[#2563eb] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex justify-center items-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Waiting...
                    </>
                  ) : (
                    t('pay')
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
