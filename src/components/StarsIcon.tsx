import React from 'react';

/** The user's Telegram Stars artwork, trimmed and made transparent for UI use. */
export const StarsIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img
    src="/telegram-stars.png"
    alt=""
    aria-hidden="true"
    width={20}
    height={20}
    draggable={false}
    className={`inline-block shrink-0 object-contain select-none pointer-events-none ${className}`}
  />
);
