import React, { useEffect } from 'react';
import { X, RotateCcw, Flame, Trash2, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { BombNft } from './BombNft';

export interface LossStat {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface GameLossModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  game: 'mines' | 'upgrade' | 'craft' | 'rocket' | 'generic';
  title?: string;
  subtitle?: string;
  crashMultiplier?: number | string;
  stats?: LossStat[];
  onNavigate?: (target: string) => void;
  retryLabel?: string;
  closeLabel?: string;
}

export const GameLossModal: React.FC<GameLossModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  game,
  title,
  subtitle,
  crashMultiplier,
  stats = [],
  onNavigate,
  retryLabel,
  closeLabel
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      try {
        (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { notificationOccurred: (t: string) => void } } } })
          ?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
      } catch {
        // Ignored
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Resolve headers based on game
  const defaultTitle = game === 'rocket' ? t('rocket_loss_title') : t('game_over');
  const defaultSubtitle = t('loss_cheer_2');

  const resolvedTitle = title || defaultTitle;
  const resolvedSubtitle = subtitle || defaultSubtitle;

  // Extract crash multiplier for rocket if available
  const rocketMult = crashMultiplier ?? stats?.find(s => 
    s.label?.toLowerCase().includes('ракет') || 
    s.label?.toLowerCase().includes('multiplier') || 
    s.label?.toLowerCase().includes('упал')
  )?.value;

  const displayMult = typeof rocketMult === 'number' 
    ? `x${rocketMult.toFixed(2)}` 
    : typeof rocketMult === 'string'
      ? (rocketMult.startsWith('x') ? rocketMult : `x${rocketMult}`)
      : null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md px-4 py-6 select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[310px] rounded-[30px] bg-[#14151b] border border-red-500/25 shadow-[0_0_60px_-10px_rgba(239,68,68,0.3),0_25px_50px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col p-5"
      >
        {/* Top Radial Crimson Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 bg-gradient-to-b from-red-600/30 via-red-500/10 to-transparent blur-2xl pointer-events-none rounded-full" />
        
        {/* Subtle Top Red Accent Line */}
        <div className="absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full lg-glass active:scale-90 text-white/50 hover:text-white flex items-center justify-center transition-all z-20 cursor-pointer"
          title={t('close')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Loss Emblem */}
        <div className="flex flex-col items-center relative mt-2 mb-2">
          <div className="relative">
            {/* Outer red ring */}
            <div className="absolute -inset-2.5 rounded-[30px] bg-red-600/20 blur-md pointer-events-none" />

            {/* Main Badge Container */}
            <div className="w-[88px] h-[88px] rounded-[24px] bg-gradient-to-b from-[#2e1014] via-[#1d0a0d] to-[#120608] border border-red-500/40 flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_20px_rgba(239,68,68,0.25)]">
              {game === 'mines' && (
                <BombNft className="w-[84%] h-[84%]" animated={true} />
              )}

              {game === 'rocket' && (
                <Flame className="w-11 h-11 text-rose-500 drop-shadow-[0_0_16px_rgba(244,63,94,0.7)]" />
              )}

              {game === 'upgrade' && (
                <ShieldAlert className="w-11 h-11 text-red-500 drop-shadow-[0_0_14px_rgba(239,68,68,0.7)]" />
              )}

              {game === 'craft' && (
                <Trash2 className="w-11 h-11 text-red-500 drop-shadow-[0_0_14px_rgba(239,68,68,0.7)]" />
              )}

              {game === 'generic' && (
                <ShieldAlert className="w-11 h-11 text-red-500 drop-shadow-[0_0_14px_rgba(239,68,68,0.7)]" />
              )}

              {/* Corner Status Badge */}
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-600 border-2 border-[#14151b] flex items-center justify-center shadow-md">
                <X className="w-3.5 h-3.5 text-white stroke-[3]" />
              </div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <h2 className="font-display text-[20px] font-bold text-white text-center mt-3 tracking-tight drop-shadow-sm">
            {resolvedTitle}
          </h2>
          <p className="text-white/60 text-[13px] text-center font-medium leading-relaxed px-1 mt-1">
            {resolvedSubtitle}
          </p>
        </div>

        {/* Rocket Only: Show crash multiplier */}
        {game === 'rocket' && displayMult && (
          <div className="bg-[#1a1b22] border border-red-500/25 rounded-[16px] py-2.5 px-4 my-2 flex items-center justify-between">
            <span className="text-[12px] text-white/50 font-medium">
              {t('crashed_at_multiplier')}
            </span>
            <span className="text-[17px] font-black text-red-400 tracking-wide tabular-nums">
              {displayMult}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          {/* Primary Retry Button */}
          {onRetry ? (
            <button
              onClick={onRetry}
              className="w-full py-3.5 rounded-[16px] font-bold text-[14px] flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.35)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>{retryLabel || t('try_again')}</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-[16px] font-bold text-[14px] flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.35)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>{retryLabel || t('play_again')}</span>
            </button>
          )}

          {/* Secondary Actions */}
          {onNavigate ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={() => {
                  onClose();
                  onNavigate('inventory');
                }}
                className="flex-1 py-2.5 rounded-[12px] text-[11px] font-bold text-white lg-glass transition-all text-center cursor-pointer active:scale-95"
              >
                {t('my_inventory')}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-[12px] text-[11px] font-bold text-white lg-glass transition-all text-center cursor-pointer active:scale-95"
              >
                {closeLabel || t('close')}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-[12px] text-[12px] font-bold text-white lg-glass transition-all cursor-pointer active:scale-95"
            >
              {closeLabel || t('close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
