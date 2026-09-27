import React, { useRef, useState } from 'react';
import { QrCode, Loader2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { GramIcon } from '../../components/GramIcon';
import { haptics } from '../../lib/haptics';

interface PremiumCardCarouselProps {
  /** Баланс в граммах, отображаемый на карте BLACK */
  balance?: number;
  /** Ник пользователя (например, @username) — выводится в нижней части карты */
  username?: string | null;
  /** Колбэк для показа подсказки/ошибки (тост) */
  onHint?: (msg: string) => void;
}

/** Подпись к фото карты (единый текст для всех способов отправки). */
function buildCardCaption(displayBalance: string, username?: string | null): string {
  const handle = username ? (username.startsWith('@') ? username : `@${username}`) : 'Platina';
  return `Player balance ${handle}: ${displayBalance} GRAM.\n\nCome play Platina Gift!\nOur Telegram channel: @platina_gift`;
}

/**
 * Отправляет именно ФОТО с текстом (не ссылку!).
 * Web Share API Level 2: файл + подпись уходят одним сообщением.
 * Возвращает 'shared' | 'cancelled' | 'unsupported'.
 */
async function sharePhotoWithCaption(
  jpegDataUrl: string,
  caption: string,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  try {
    const blob = await (await fetch(jpegDataUrl)).blob();
    const file = new File([blob], 'platina-card.jpg', { type: 'image/jpeg' });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: caption, title: 'Platina Gift Card' });
        return 'shared';
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') return 'cancelled';
      }
    }
  } catch {
    // fallthrough
  }
  return 'unsupported';
}

function GlowBlack() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]" aria-hidden="true">
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/[0.12] rounded-full blur-[50px]" />
      <div className="absolute top-0 right-20 w-40 h-40 bg-white/[0.08] rounded-full blur-[30px]" />
    </div>
  );
}

/**
 * Основная карта кошелька — карта BLACK с балансом в граммах.
 * Кнопка QR: рендерит карту в JPEG и отправляет её через Telegram
 * (shareMessage → выбор чата) как фото с подписью, с англоязычным текстом.
 * Если нативный шеринг недоступен — фото уходит файлом через системный
 * шеринг или ботом в чат пользователя (никогда не ссылкой).
 */
export function PremiumCardCarousel({ balance = 0, username, onHint }: PremiumCardCarouselProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const value = Number(balance) || 0;
  const displayBalance = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleShare = async () => {
    if (sharing || !cardRef.current) return;
    haptics.impact('light');
    setSharing(true);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const token = sessionStorage.getItem('pg_session_token');
      const caption = buildCardCaption(displayBalance, username);

      // Снимок карты в JPEG (Telegram требует JPEG для photo_url в inline-результатах)
      // skipFonts: true предотвращает чтение cross-origin шрифтов и сетевые сбои cssRules
      const image = await toJpeg(cardRef.current, {
        quality: 0.94,
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        backgroundColor: '#070708',
        filter: (node) => !(node instanceof HTMLElement && node.dataset.shareExclude === '1'),
      });

      if (!token) {
        // Гостевой режим: отправляем фото с текстом через системный шеринг
        const result = await sharePhotoWithCaption(image, caption);
        if (result === 'shared') {
          haptics.notify('success');
        } else if (result !== 'cancelled') {
          onHint?.('Sharing is available inside Telegram');
        }
        return;
      }

      const res = await fetch('/api/wallet/share-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data?.photoUrl) {
        throw new Error(data?.error || 'Share failed');
      }

      // 1. Нативный шеринг Telegram: фото + подпись, выбор чата
      if (data?.preparedMessageId && tg && typeof tg.shareMessage === 'function') {
        tg.shareMessage(data.preparedMessageId, (sent: boolean) => {
          if (sent) haptics.notify('success');
        });
        return;
      }

      // 2. Web Share с самим фото и подписью (никаких ссылок!)
      const result = await sharePhotoWithCaption(image, data?.caption || caption);
      if (result === 'shared') {
        haptics.notify('success');
        return;
      }
      if (result === 'cancelled') return;

      // 3. Бот отправляет карту в чат пользователя — фото с текстом гарантированно
      try {
        const sendRes = await fetch('/api/wallet/share-card/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image }),
        });
        if (sendRes.ok) {
          onHint?.('Card sent to your chat with the bot — forward it anywhere');
          haptics.notify('success');
          return;
        }
      } catch {
        // fallthrough to link copy
      }

      // 4. Совсем последний вариант — ссылка на фото
      if (data?.photoUrl && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.photoUrl);
        onHint?.('Link copied');
        haptics.notify('success');
      } else {
        onHint?.('Sharing is available inside Telegram');
      }
    } catch (e: any) {
      console.warn('[share-card]', e);
      haptics.notify('error');
      onHint?.(e?.message || 'Не удалось поделиться картой');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="w-full">
      <div
        ref={cardRef}
        className="relative w-full min-h-[200px] rounded-[32px] border overflow-hidden select-none bg-[#070708] border-white/15 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]"
      >
        {/* Background effects */}
        <GlowBlack />

        {/* Content */}
        <div className="relative z-10 p-5 flex flex-col h-full min-h-[200px]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <span className="font-display text-white/90 text-[20px] font-bold tracking-tight">Platina</span>
            <span className="px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-wider bg-white/[0.06] border-white/15 text-white/60">
              BLACK
            </span>
          </div>

          {/* Balance in grams */}
          <div className="flex-1 flex flex-col justify-center">
            <div
              className="flex items-center justify-center gap-[0.14em] font-display font-bold text-white leading-none tracking-tight drop-shadow-sm"
              style={{ fontWeight: 800, fontSize: 'clamp(40px, 9.5vw, 58px)', letterSpacing: '-0.03em' }}
              aria-label={`Баланс: ${displayBalance} грамм`}
            >
              <span className="whitespace-nowrap">{displayBalance}</span>
              <GramIcon className="h-[0.4em] w-[0.4em] mb-[0.07em] drop-shadow-md" />
            </div>
          </div>

          {/* Footer: ник + QR (поделиться) */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-white/60 text-[14px] font-medium tracking-wide truncate block max-w-full">
              {username || 'Platina'}
            </span>
            <button
              type="button"
              data-share-exclude="1"
              onClick={handleShare}
              disabled={sharing}
              aria-label="Поделиться картой"
              className="shrink-0 w-9 h-9 rounded-full bg-white/[0.06] border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF]"
            >
              {sharing ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <QrCode className="w-[18px] h-[18px]" strokeWidth={2.2} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
