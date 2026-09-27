import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { WithdrawDraft, WithdrawalQuote, Withdrawal, AssetConfig } from '../types';
import { getMockAssets, createQuote, createWithdrawal, getWithdrawal } from '../withdrawalApi';
import { validateAddressForNetwork, isQuoteExpired } from '../validation';
import { AssetStep } from './AssetStep';
import { RecipientStep } from './RecipientStep';
import { AmountStep } from './AmountStep';
import { ReviewStep } from './ReviewStep';
import { atomicToDecimalString } from '../formatting';

type Step = 'asset' | 'recipient' | 'amount' | 'review' | 'result';

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  initialAsset?: string;
  onSuccess?: (w: Withdrawal) => void;
}

export function WithdrawDialog({ open, onClose, initialAsset, onSuccess }: WithdrawDialogProps) {
  const [step, setStep] = useState<Step>('asset');
  const [assets] = useState<AssetConfig[]>(() => getMockAssets());
  const [selectedAsset, setSelectedAsset] = useState<string>(initialAsset || 'TON');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [destination, setDestination] = useState('');
  const [amountAtomic, setAmountAtomic] = useState('0');
  const [amountInput, setAmountInput] = useState('');
  const [quote, setQuote] = useState<WithdrawalQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const idempotencyKeyRef = useRef<string>(`idem_${Math.random().toString(36).slice(2)}_${Date.now()}`);

  // Focus management
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      // focus dialog
      setTimeout(() => dialogRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // return focus to trigger (withdraw button)
      if (triggerRef.current) {
        try {
          triggerRef.current.focus();
        } catch {}
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Initialize networks when asset changes
  const currentAssetCfg = assets.find((a) => a.symbol === selectedAsset);
  const networks = currentAssetCfg?.networks || [];

  useEffect(() => {
    if (networks.length > 0 && !networks.find((n) => n.id === selectedNetwork)) {
      setSelectedNetwork(networks[0].id);
    }
  }, [selectedAsset, networks, selectedNetwork]);

  // Reset quote when amount or destination changes
  useEffect(() => {
    if (quote && isQuoteExpired(quote.expiresAt)) {
      setQuoteError('Котировка истекла, обновите');
    }
  }, [quote]);

  const handleRequestQuote = useCallback(async () => {
    setQuoteError(null);
    setFieldErrors({});
    setGlobalError(null);

    // Validate
    if (!selectedAsset) {
      setFieldErrors((p) => ({ ...p, asset: 'Выберите актив' }));
      return;
    }
    if (!selectedNetwork) {
      setFieldErrors((p) => ({ ...p, network: 'Выберите сеть' }));
      return;
    }
    const addrRes = validateAddressForNetwork(destination, selectedNetwork);
    if (!addrRes.valid) {
      setFieldErrors((p) => ({ ...p, destination: addrRes.error || 'Неверный адрес' }));
      return;
    }
    if (!amountAtomic || amountAtomic === '0') {
      setFieldErrors((p) => ({ ...p, amount: 'Введите сумму' }));
      return;
    }

    const draft: WithdrawDraft = {
      asset: selectedAsset,
      network: selectedNetwork,
      destination: destination.trim(),
      amountAtomic,
    };

    setQuoteLoading(true);
    try {
      const q = await createQuote(draft);
      setQuote(q);
      setQuoteError(null);
    } catch (err: any) {
      const code = err.code;
      const field = err.field;
      const msg = err.message || 'Не удалось получить котировку';
      if (field) {
        setFieldErrors((p) => ({ ...p, [field]: msg }));
      } else {
        setGlobalError(msg);
      }
      setQuoteError(msg);
      if (code === 'BELOW_MINIMUM' && err.minAtomic && currentAssetCfg) {
        const minDisplay = atomicToDecimalString(err.minAtomic, currentAssetCfg.decimals);
        setQuoteError(`Минимальная сумма: ${minDisplay} ${selectedAsset}`);
      }
    } finally {
      setQuoteLoading(false);
    }
  }, [selectedAsset, selectedNetwork, destination, amountAtomic, currentAssetCfg]);

  const handleSubmit = useCallback(async () => {
    if (!quote) {
      setGlobalError('Нет актуальной котировки');
      return;
    }
    if (isQuoteExpired(quote.expiresAt)) {
      setGlobalError('Котировка истекла, обновите');
      return;
    }
    const draft: WithdrawDraft = {
      asset: selectedAsset,
      network: selectedNetwork,
      destination: destination.trim(),
      amountAtomic,
    };

    setSubmitting(true);
    setGlobalError(null);
    try {
      const w = await createWithdrawal(draft, quote, idempotencyKeyRef.current);
      setWithdrawal(w);
      setStep('result');
      setPolling(true);
      // Poll status
      const interval = setInterval(async () => {
        try {
          const updated = await getWithdrawal(w.id);
          setWithdrawal(updated);
          if (updated.status !== 'pending') {
            clearInterval(interval);
            setPolling(false);
            if (updated.status === 'success' && onSuccess) onSuccess(updated);
          }
        } catch {}
      }, 1500);
      // Stop polling after 20s
      setTimeout(() => {
        clearInterval(interval);
        setPolling(false);
      }, 20000);
    } catch (err: any) {
      setGlobalError(err.message || 'Ошибка создания вывода');
    } finally {
      setSubmitting(false);
    }
  }, [quote, selectedAsset, selectedNetwork, destination, amountAtomic, onSuccess]);

  const canGoNext = () => {
    switch (step) {
      case 'asset':
        return !!selectedAsset && !!selectedNetwork;
      case 'recipient':
        return !!destination && validateAddressForNetwork(destination, selectedNetwork).valid;
      case 'amount':
        return !!amountAtomic && amountAtomic !== '0' && !!quote && !isQuoteExpired(quote.expiresAt) && !quoteError;
      case 'review':
        return !!quote && !isQuoteExpired(quote.expiresAt);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (!canGoNext()) return;
    const order: Step[] = ['asset', 'recipient', 'amount', 'review', 'result'];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  };

  const prevStep = () => {
    const order: Step[] = ['asset', 'recipient', 'amount', 'review', 'result'];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const resetFlow = () => {
    setStep('asset');
    setDestination('');
    setAmountAtomic('0');
    setAmountInput('');
    setQuote(null);
    setQuoteError(null);
    setFieldErrors({});
    setGlobalError(null);
    setWithdrawal(null);
    idempotencyKeyRef.current = `idem_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  };

  const handleClose = () => {
    // Preserve data on error, but reset if success?
    onClose();
  };

  if (!open) return null;

  const explorerUrl = currentAssetCfg?.networks.find((n) => n.id === selectedNetwork)?.explorerUrl;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Dialog / Bottom sheet */}
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Вывод средств"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="relative z-10 w-full max-w-[520px] bg-[#0B0B0D] border border-white/10 rounded-t-[32px] md:rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.8)] max-h-[92vh] flex flex-col outline-none overflow-hidden"
      >
        {/* Grab handle mobile */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'asset' && step !== 'result' && (
              <button
                onClick={prevStep}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors active:scale-95 cursor-pointer"
                aria-label="Назад"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="font-display text-[18px] font-bold text-white tracking-tight">Вывод средств</h2>
              <div className="flex items-center gap-1.5 mt-1">
                {(['asset', 'recipient', 'amount', 'review'] as Step[]).map((s, i) => (
                  <div key={s} className={`h-1 rounded-full transition-all ${step === s ? 'w-6 bg-[#1683FF]' : i < (['asset', 'recipient', 'amount', 'review'].indexOf(step)) ? 'w-4 bg-white/40' : 'w-4 bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-95 cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {step === 'asset' && (
                <AssetStep
                  assets={assets}
                  selectedAsset={selectedAsset}
                  selectedNetwork={selectedNetwork}
                  onSelectAsset={setSelectedAsset}
                  onSelectNetwork={setSelectedNetwork}
                  networks={networks}
                  availableAtomic={currentAssetCfg?.availableAtomic || '0'}
                  decimals={currentAssetCfg?.decimals || 9}
                />
              )}
              {step === 'recipient' && (
                <RecipientStep
                  networkId={selectedNetwork}
                  destination={destination}
                  onChange={setDestination}
                  error={fieldErrors.destination}
                />
              )}
              {step === 'amount' && currentAssetCfg && (
                <AmountStep
                  assetSymbol={selectedAsset}
                  decimals={currentAssetCfg.decimals}
                  availableAtomic={currentAssetCfg.availableAtomic}
                  amountAtomic={amountAtomic}
                  onAmountAtomicChange={setAmountAtomic}
                  amountInput={amountInput}
                  onAmountInputChange={setAmountInput}
                  quote={quote}
                  quoteLoading={quoteLoading}
                  quoteError={quoteError || fieldErrors.amount}
                  onRequestQuote={handleRequestQuote}
                />
              )}
              {step === 'review' && quote && (
                <ReviewStep
                  draft={{ asset: selectedAsset, network: selectedNetwork, destination, amountAtomic }}
                  quote={quote}
                  assetDecimals={currentAssetCfg?.decimals || 9}
                  assetSymbol={selectedAsset}
                  explorerUrl={explorerUrl}
                />
              )}
              {step === 'result' && withdrawal && (
                <div className="space-y-5 text-center py-4">
                  {withdrawal.status === 'pending' && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto">
                        <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
                      </div>
                      <h3 className="text-white font-bold text-[18px]">Обработка...</h3>
                      <p className="text-white/60 text-[13px] leading-relaxed">Ваш вывод принят и обрабатывается. Обычно это занимает 1–3 минуты.</p>
                    </>
                  )}
                  {withdrawal.status === 'success' && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-white font-bold text-[18px]">Успешно отправлено</h3>
                      <p className="text-white/60 text-[13px]">Средства отправлены на внешний адрес.</p>
                    </>
                  )}
                  {(withdrawal.status === 'failed' || withdrawal.status === 'requires_review') && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-white font-bold text-[18px]">{withdrawal.status === 'failed' ? 'Ошибка вывода' : 'Требуется проверка'}</h3>
                      <p className="text-white/60 text-[13px]">{withdrawal.errorMessage || 'Операция требует ручной проверки, мы уведомим вас.'}</p>
                    </>
                  )}

                  <div className="text-left p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/50">ID операции</span>
                      <span className="text-white font-mono text-[12px]">{withdrawal.id}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/50">Статус</span>
                      <span className={`font-semibold capitalize ${withdrawal.status === 'success' ? 'text-emerald-400' : withdrawal.status === 'pending' ? 'text-amber-400' : 'text-red-400'}`}>{withdrawal.status}</span>
                    </div>
                    {withdrawal.transactionHash && (
                      <div className="flex justify-between text-[12px] gap-2">
                        <span className="text-white/50">Tx Hash</span>
                        <a href={`${explorerUrl}/tx/${withdrawal.transactionHash}`} target="_blank" rel="noopener noreferrer" className="text-[#1683FF] hover:underline font-mono truncate max-w-[160px]">{withdrawal.transactionHash.slice(0, 20)}...</a>
                      </div>
                    )}
                  </div>

                  {withdrawal.status === 'failed' && (
                    <button
                      onClick={() => {
                        setStep('review');
                        setGlobalError(null);
                        idempotencyKeyRef.current = `idem_${Math.random().toString(36).slice(2)}_${Date.now()}`;
                      }}
                      className="w-full py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-semibold border border-white/10 transition-colors active:scale-[0.98] cursor-pointer"
                    >
                      Повторить
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {globalError && step !== 'result' && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[13px]" role="alert" aria-live="polite">
              {globalError}
            </div>
          )}

          <div aria-live="polite" className="sr-only">
            {step === 'result' && withdrawal ? `Статус вывода: ${withdrawal.status}` : ''}
          </div>
        </div>

        {/* Footer actions */}
        {step !== 'result' && (
          <div className="p-5 pt-3 border-t border-white/5 shrink-0 bg-[#0B0B0D]">
            <div className="flex gap-3">
              {step !== 'asset' && (
                <button
                  onClick={prevStep}
                  className="flex-1 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors active:scale-[0.98] cursor-pointer"
                >
                  Назад
                </button>
              )}
              {step === 'review' ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !canGoNext()}
                  className="flex-[2] py-3.5 rounded-2xl bg-[#1683FF] hover:bg-[#1478eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_8px_24px_rgba(22,131,255,0.25)] cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    'Подтвердить вывод'
                  )}
                </button>
              ) : (
                <button
                  onClick={step === 'amount' ? handleRequestQuote : nextStep}
                  disabled={!canGoNext() || quoteLoading}
                  className="flex-[2] py-3.5 rounded-2xl bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                  {step === 'amount' && !quote ? 'Рассчитать' : 'Далее'}
                </button>
              )}
            </div>
            <div className="mt-3 text-[11px] text-white/30 text-center leading-relaxed">
              Нажимая «Подтвердить вывод», вы соглашаетесь с необратимостью операции.
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="p-5 pt-3 border-t border-white/5 shrink-0">
            <button
              onClick={() => {
                if (withdrawal?.status === 'success') {
                  resetFlow();
                  onClose();
                } else {
                  resetFlow();
                }
              }}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-bold hover:bg-white/90 transition-colors active:scale-[0.98] cursor-pointer"
            >
              {withdrawal?.status === 'success' ? 'Готово' : 'Новый вывод'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
