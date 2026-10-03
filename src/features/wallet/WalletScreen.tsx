import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WalletBalanceCard } from './WalletBalanceCard';
import { QuickActions } from './QuickActions';
import { PremiumCardCarousel } from './PremiumCardCarousel';
import { WithdrawDialog } from './WithdrawDialog/WithdrawDialog';
import { getWalletSummary } from './withdrawalApi';
import { useTranslation } from '../../lib/i18n';
import type { WalletSummary } from './types';

interface WalletScreenProps {
  balance: number; // GRAM balance from existing app
  onClose?: () => void;
  onDeposit?: () => void;
  onGoToInventory?: () => void;
}

export function WalletScreen({ balance, onClose, onDeposit, onGoToInventory }: WalletScreenProps) {
  const { t } = useTranslation();
  const [, setSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [showDepositSheet, setShowDepositSheet] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getWalletSummary()
      .then((s) => {
        if (mounted) {
          setSummary(s);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(e.message || t('loading_error'));
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const showHint = (msg: string) => {
    setHint(msg);
    setTimeout(() => setHint(null), 2500);
  };

  // Баланс — в граммах (свойство balance), карточка показывает его с значком GRAM
  const gramDisplay = balance.toFixed(2);
  // For skeleton, use loading flag

  return (
    <main
      aria-label={t('wallet')}
      className="relative min-h-full bg-canvas text-white flex flex-col items-center overflow-hidden"
      style={{
        animation: 'walletFadeIn 220ms ease-out',
      }}
    >
      {/* Тот же ambient-фон, что и во всём приложении */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full bg-white/[0.07] blur-[160px]" />
      </div>
      <style>{`
        @keyframes walletFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          main[aria-label={t('wallet')}] { animation: none !important; }
          .motion-reduce-none { transition: none !important; animation: none !important; }
        }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="w-full max-w-[720px] px-4 md:px-6 py-4 md:py-6 space-y-5">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <WalletBalanceCard amount={gramDisplay} loading={loading} />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: 0.05 }}
        >
          <QuickActions
            onDeposit={() => {
              setShowDepositSheet(true);
              if (onDeposit) onDeposit();
            }}
            onWithdraw={() => setShowWithdraw(true)}
          />
        </motion.div>

        {/* Карта BLACK */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: 0.1 }}
        >
          <PremiumCardCarousel balance={balance} />
        </motion.div>

        {/* Additional info / inventory shortcut */}
        {onGoToInventory && (
          <div className="rounded-[24px] bg-white/[0.04] border border-white/[0.06] p-4 mt-2">
            <h3 className="font-display font-bold text-white text-[15px] mb-2">{t('nft_withdraw')}</h3>
            <p className="text-white/50 text-[13px] leading-relaxed mb-3">{t('withdraw_nft_description')}</p>
            <button
              onClick={onGoToInventory}
              className="w-full py-3 rounded-2xl lg-glass text-white font-semibold text-[14px] transition-colors cursor-pointer"
            >
              {t('go_to_inventory')}
            </button>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[13px] flex flex-col gap-3">
            <span>{t('wallet_load_error')}: {error}</span>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                getWalletSummary()
                  .then((s) => {
                    setSummary(s);
                    setLoading(false);
                  })
                  .catch((e) => {
                    setError(e.message);
                    setLoading(false);
                  });
              }}
              className="self-start px-4 py-2 rounded-xl lg-glass text-white text-[12px] font-semibold cursor-pointer"
            >
              {t('welcome_retry')}
            </button>
          </div>
        )}
      </div>

      {/* Withdraw Dialog */}
      <AnimatePresence>
        {showWithdraw && (
          <WithdrawDialog
            open={showWithdraw}
            onClose={() => setShowWithdraw(false)}
            onSuccess={() => {
              showHint(t('withdrawal_created'));
            }}
          />
        )}
      </AnimatePresence>

      {/* Deposit Sheet - reuse existing logic? Simple placeholder */}
      <AnimatePresence>
        {showDepositSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] flex items-end md:items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDepositSheet(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative z-10 w-full max-w-[520px] bg-[#0B0B0D] border border-white/10 rounded-t-[32px] md:rounded-[28px] p-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 md:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white text-[18px]">{t('topup')}</h2>
                <button
                  onClick={() => setShowDepositSheet(false)}
                  className="w-9 h-9 rounded-full lg-glass flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
                  aria-label={t('close')}
                >
                  ✕
                </button>
              </div>
              <p className="text-white/60 text-[13px] leading-relaxed mb-4">
                {t('deposit_sheet_desc')}
              </p>
              <button
                onClick={() => {
                  setShowDepositSheet(false);
                  if (onDeposit) onDeposit();
                }}
                className="w-full py-3.5 rounded-2xl bg-[#1683FF] text-white font-bold hover:bg-[#1478eb] transition-colors cursor-pointer"
              >
                {t('open_topup')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint toast */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-2.5 rounded-full bg-[#17171A]/95 backdrop-blur-xl border border-white/[0.08] text-white text-[13px] font-bold tracking-wide shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] pointer-events-none whitespace-nowrap"
            aria-live="polite"
          >
            {hint}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
