import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Check, ClipboardPaste } from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { GramIcon } from './GramIcon';
import { useTranslation } from '../lib/i18n';
import { haptics } from '../lib/haptics';
import { useRates, formatUsd } from '../hooks/useRates';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/kit';

interface SendModalProps {
  balance: number;
  onClose: () => void;
  onSuccess: (amount: number, recipient: string) => void;
  demoMode?: boolean;
}

function looksLikeTonAddress(s: string): boolean {
  const t = s.trim();
  // raw 64-hex or user-friendly base64url (48 chars)
  return /^[0-9a-fA-F]{64}$/.test(t) || /^(EQ|UQ|Ef|Uf|0)[A-Za-z0-9_-]{46,47}$/.test(t);
}

export const SendModal: React.FC<SendModalProps> = ({ balance, onClose, onSuccess, demoMode }) => {
  const { t } = useTranslation();
  const rates = useRates();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const numAmount = parseFloat(amount) || 0;

  const handleQuickAmount = (pct: number) => {
    setAmount((balance * pct).toFixed(2));
    setError(null);
    haptics.selection();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRecipient(text.trim());
        setError(null);
        haptics.selection();
      }
    } catch {}
  };

  const handleSend = async () => {
    setError(null);
    if (!recipient.trim()) {
      setError(t('enter_recipient'));
      haptics.notify('error');
      return;
    }
    if (numAmount <= 0) {
      setError(t('enter_amount'));
      haptics.notify('error');
      return;
    }
    if (numAmount > balance) {
      setError(t('insufficient'));
      haptics.notify('error');
      return;
    }

    haptics.impact('medium');

    // Demo mode: simulate an internal transfer.
    if (demoMode) {
      setIsSending(true);
      setTimeout(() => {
        setIsSending(false);
        setIsSent(true);
        haptics.notify('success');
        setTimeout(() => {
          onSuccess(numAmount, recipient.trim());
          onClose();
        }, 1000);
      }, 600);
      return;
    }

    // Real mode: only send on-chain TON to a valid address with a connected
    // wallet. Never silently burn internal balance.
    if (!looksLikeTonAddress(recipient)) {
      setError(t('enter_recipient'));
      haptics.notify('error');
      return;
    }
    if (!wallet) {
      setError(t('connect_wallet'));
      haptics.notify('error');
      return;
    }

    setIsSending(true);
    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: recipient.trim(), amount: Math.floor(numAmount * 1e9).toString() }],
      });
      setIsSent(true);
      haptics.notify('success');
      setTimeout(() => {
        onSuccess(numAmount, recipient.trim());
        onClose();
      }, 1000);
    } catch (e) {
      setError(t('error'));
      haptics.notify('error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={t('send_title')}
      subtitle={t('send_subtitle')}
      icon={
        <div className="w-9 h-9 rounded-full bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
          <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
        </div>
      }
    >
      {isSent ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-10 flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-positive/20 border border-positive/30 flex items-center justify-center text-positive">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h3 className="font-display text-xl font-bold text-white">{t('sent_title')}</h3>
          <p className="text-muted text-sm max-w-xs">
            {numAmount.toFixed(2)} GRAM → {recipient.slice(0, 8)}…
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Recipient */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>{t('recipient')}</span>
              <button onClick={handlePaste} className="flex items-center gap-1 text-brand font-bold cursor-pointer active:scale-95 transition-transform">
                <ClipboardPaste className="w-3.5 h-3.5" /> {t('paste')}
              </button>
            </div>
            <input
              value={recipient}
              onChange={(e) => { setRecipient(e.target.value); setError(null); }}
              placeholder={t('recipient_ph')}
              className="w-full bg-black/30 border border-hairline focus:border-brand/40 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-white/25 outline-none transition-colors font-mono"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>{t('amount')}</span>
              <span>{t('available')}: <span className="text-white font-bold">{balance.toFixed(2)} GRAM</span></span>
            </div>
            <div className="bg-black/30 border border-hairline rounded-xl p-4 focus-within:border-brand/40 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <input
                  value={amount}
                  inputMode="decimal"
                  onChange={(e) => {
                    let v = e.target.value.replace(/,/g, '.');
                    if (/^\d*\.?\d*$/.test(v)) { setAmount(v); setError(null); }
                  }}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-2xl font-display font-black text-white outline-none min-w-0"
                />
                <GramIcon className="w-6 h-6 text-brand shrink-0" />
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-hairline">
                {[0.25, 0.5, 0.75, 1].map((p) => (
                  <button key={p} onClick={() => handleQuickAmount(p)} className="py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-hairline active:scale-95 transition-all cursor-pointer">
                    {p === 1 ? 'MAX' : `${p * 100}%`}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-muted text-[12px]">≈</span>
                <span className="text-muted text-[12px] font-medium">{formatUsd(numAmount, rates.gramUsd)}</span>
              </div>
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-negative text-xs font-semibold text-center">
              {error}
            </motion.p>
          )}

          {!wallet && !demoMode && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-muted text-[12px] text-center">{t('connect_wallet')}</p>
              <TonConnectButton />
            </div>
          )}

          <Button full size="lg" loading={isSending} onClick={handleSend} disabled={numAmount <= 0 || !recipient.trim()}>
            {!isSending && <ArrowUpRight className="w-4 h-4" />}
            <span>{isSending ? t('sending') : `${t('send_btn')} ${numAmount > 0 ? numAmount.toFixed(2) : ''} GRAM`}</span>
          </Button>
        </div>
      )}
    </Sheet>
  );
};
