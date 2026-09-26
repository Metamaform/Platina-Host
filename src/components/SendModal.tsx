import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUpRight, Check, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { GramIcon } from './GramIcon';

interface SendModalProps {
  balance: number;
  onClose: () => void;
  onSuccess: (amount: number, recipient: string) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  balance,
  onClose,
  onSuccess
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const numAmount = parseFloat(amount) || 0;

  const handleQuickAmount = (pct: number) => {
    const val = (balance * pct).toFixed(2);
    setAmount(val);
    setError(null);
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRecipient(text.trim());
        setError(null);
        try { (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
      }
    } catch (e) {
      // Fallback
    }
  };

  const handleSend = () => {
    setError(null);
    if (!recipient.trim()) {
      setError('Укажите адрес кошелька TON или @username получателя');
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch (e) {}
      return;
    }

    if (numAmount <= 0) {
      setError('Введите сумму перевода больше 0');
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch (e) {}
      return;
    }

    if (numAmount > balance) {
      setError('Недостаточно средств на балансе');
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch (e) {}
      return;
    }

    setIsSending(true);
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch (e) {}

    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
      setTimeout(() => {
        onSuccess(numAmount, recipient.trim());
        onClose();
      }, 1200);
    }, 1000);
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
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Sheet Container */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="relative w-full max-w-md bg-[#131720] border-t sm:border border-white/[0.09] rounded-t-[32px] sm:rounded-[32px] p-6 text-white shadow-[0_-12px_40px_rgba(0,0,0,0.8)] z-10 max-h-[92vh] overflow-y-auto"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#0098EA]/15 border border-[#0098EA]/30 flex items-center justify-center text-[#0098EA]">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Отправить Gram</h2>
              <p className="text-[11px] text-white/40">Сеть The Open Network (TON)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSent ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-3"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="font-display text-xl font-bold text-white">Перевод отправлен</h3>
            <p className="text-white/60 text-sm max-w-xs">
              {numAmount.toFixed(2)} GRAM успешно переведены на адрес {recipient.slice(0, 8)}...
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Recipient Address Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                <span>Получатель</span>
                <span className="text-[11px] text-white/40">TON адрес или @username</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setError(null);
                  }}
                  placeholder="EQ... или @username"
                  className="w-full bg-[#18202d] border border-white/10 focus:border-[#0098EA]/60 rounded-2xl px-4 py-3 text-sm font-medium text-white placeholder-white/25 outline-none transition-colors pr-20"
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-2 px-2.5 py-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-bold text-[#0098EA] transition-colors cursor-pointer"
                >
                  Вставить
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                <span>Сумма</span>
                <span className="text-[11px] text-white/50">
                  Доступно: <span className="text-white font-bold">{balance.toFixed(2)} GRAM</span>
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  placeholder="0.00"
                  className="w-full bg-[#18202d] border border-white/10 focus:border-[#0098EA]/60 rounded-2xl px-4 py-3.5 text-lg font-bold font-display text-white placeholder-white/25 outline-none transition-colors pr-24"
                />
                <div className="absolute right-3 flex items-center gap-1.5">
                  <GramIcon className="w-5 h-5 text-[#0098EA]" />
                  <span className="text-xs font-bold text-white/80">GRAM</span>
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { label: '25%', val: 0.25 },
                  { label: '50%', val: 0.5 },
                  { label: '75%', val: 0.75 },
                  { label: 'МАКС', val: 1 }
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleQuickAmount(chip.val)}
                    className="py-1.5 rounded-xl bg-[#18202d] border border-white/5 hover:border-white/15 text-xs font-bold text-white/70 hover:text-white transition-all active:scale-95 cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Network Fee & Notice */}
            <div className="p-3.5 rounded-2xl bg-[#18202d]/70 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/45">Комиссия сети</span>
                <span className="text-emerald-400 font-semibold font-mono">~0.005 TON (0 GRAM)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/45">Примерная стоимость</span>
                <span className="text-white/80 font-medium font-mono">
                  ≈ ${(numAmount * 0.95).toFixed(2)} USD
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-white/40 border-t border-white/5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0098EA]" />
                <span>Защищенный смарт-контракт сети TON</span>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Action */}
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || numAmount <= 0 || !recipient.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#0098EA] hover:bg-[#0087d1] text-white font-bold text-sm tracking-wide shadow-lg shadow-[#0098EA]/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Отправить {numAmount > 0 ? `${numAmount.toFixed(2)} GRAM` : ''}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
