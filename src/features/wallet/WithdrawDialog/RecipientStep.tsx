import React, { useState } from 'react';
import { ClipboardPaste, QrCode } from 'lucide-react';
import { validateAddressForNetwork } from '../validation';
import { useTranslation } from '../../../lib/i18n';

interface RecipientStepProps {
  networkId: string;
  destination: string;
  onChange: (addr: string) => void;
  error?: string | null;
}

export function RecipientStep({ networkId, destination, onChange, error }: RecipientStepProps) {
  const { t } = useTranslation();
  const [localError, setLocalError] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        const res = validateAddressForNetwork(text.trim(), networkId);
        setLocalError(res.valid ? null : res.error || null);
      }
    } catch {
      // fallback
      setLocalError(t('paste_failed'));
    }
  };

  const handleChange = (val: string) => {
    onChange(val);
    if (val.trim().length > 10) {
      const res = validateAddressForNetwork(val, networkId);
      setLocalError(res.valid ? null : res.error || null);
    } else {
      setLocalError(null);
    }
  };

  const displayError = error || localError;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-bold text-[16px] mb-3">{t('recipient')}</h3>
        <p className="text-white/50 text-[13px] mb-3 leading-relaxed">
          {t('recipient_external_hint')} <span className="text-white font-semibold">{networkId}</span>. {t('recipient_external_hint2')}
        </p>

        <div className="relative">
          <input
            type="text"
            value={destination}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={networkId === 'TON' ? 'EQ... / UQ...' : networkId === 'BTC' ? 'bc1...' : '0x...'}
            className={`w-full bg-white/[0.06] border rounded-2xl px-4 py-3.5 pr-[96px] text-[14px] font-mono text-white placeholder-white/30 outline-none transition-colors focus:border-[#1683FF]/60 ${
              displayError ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10'
            }`}
            aria-invalid={!!displayError}
            aria-describedby={displayError ? 'recipient-error' : undefined}
          />
          <div className="absolute right-1.5 top-1.5 bottom-1.5 flex gap-1">
            <button
              type="button"
              onClick={handlePaste}
              className="px-2.5 rounded-xl lg-glass text-white/80 hover:text-white text-[12px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              aria-label={t('paste')}
            >
              <ClipboardPaste className="w-4 h-4" />
              {t('paste')}
            </button>
          </div>
        </div>

        {displayError ? (
          <p id="recipient-error" className="mt-2 text-red-400 text-[12px] font-medium">
            {displayError}
          </p>
        ) : destination ? (
          <p className="mt-2 text-emerald-400 text-[12px]">✓ {t('address_valid')}</p>
        ) : null}

        <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex gap-2.5">
          <QrCode className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
          <div className="text-[12px] leading-relaxed text-white/50">
            {t('qr_soon')}
          </div>
        </div>
      </div>
    </div>
  );
}
