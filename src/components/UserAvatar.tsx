import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

/**
 * Оставляет только реальный URL аватарки из Telegram (или прокси `/api/telegram/avatar/...`).
 * Любые индивидуальные сгенерированные заглушки (dicebear, unsplash и т.п.) отбрасываются,
 * чтобы вместо них показывалась стандартная серая заглушка с силуэтом человека.
 */
export function sanitizeAvatarUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('dicebear.com') ||
    lower.includes('unsplash.com') ||
    lower.includes('ui-avatars.com') ||
    lower.includes('pravatar.cc') ||
    lower.includes('robohash.org')
  ) {
    return undefined;
  }
  return trimmed;
}

export interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
  style?: React.CSSProperties;
  title?: string;
}

/**
 * Единый компонент аватара:
 * - если синхронизировано фото профиля Telegram (`src`) и оно успешно загружается — показывает его;
 * - иначе показывает стандартную серую заглушку (серый фон + серый силуэт человека).
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt = '',
  className = 'w-10 h-10',
  iconClassName,
  style,
  title,
}) => {
  const cleanSrc = sanitizeAvatarUrl(src);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [cleanSrc]);

  const showImage = Boolean(cleanSrc && !imgError);

  return (
    <div
      title={title}
      style={style}
      className={`relative rounded-full bg-[#15161b] flex items-center justify-center overflow-hidden select-none ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-white/5" />
      {showImage ? (
        <img
          src={cleanSrc}
          alt={alt}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover relative z-10"
        />
      ) : (
        <User
          className={`${iconClassName || 'w-[54%] h-[54%]'} text-muted relative z-10 shrink-0`}
          strokeWidth={2}
        />
      )}
    </div>
  );
};

export default UserAvatar;
