import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

interface LiquidDialogProps {
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actionLabel?: string;
  tone?: 'brand' | 'amber';
}

/**
 * Инструкции и справки в том же стекле, что нижнее меню:
 * тёмная капсула, брендовый чип, белый текст, кнопка не обрезается.
 * Портал в body — модалка не клипится скроллом и трансформом вкладки.
 */
export function LiquidDialog({
  onClose,
  title,
  subtitle,
  icon,
  children,
  actionLabel,
  tone = 'brand',
}: LiquidDialogProps) {
  const { t } = useTranslation();
  if (typeof document === 'undefined') return null;

  const chip =
    tone === 'amber'
      ? 'lg-glass text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
      : 'lg-glass text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';

  const action =
    tone === 'amber'
      ? 'bg-white/[0.09] hover:bg-white/[0.13] border border-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
      : 'bg-white/[0.09] hover:bg-white/[0.13] border border-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.button
        type="button"
        aria-label={t('close')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="group relative z-10 w-full max-w-sm max-h-[85vh] flex flex-col rounded-t-[32px] sm:rounded-[28px] bg-[#16171b]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_25px_50px_-12px_rgba(0,0,0,0.9)] overflow-hidden text-white"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-t-[32px] sm:rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_62%)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-4/5 h-16 rounded-full bg-white/[0.08] blur-2xl opacity-70"
        />
        <div className="relative z-10 w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="relative z-10 flex items-center gap-3 p-5 pb-3 border-b border-white/[0.08] shrink-0">
          {icon && (
            <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${chip}`}>
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold tracking-tight text-white leading-tight truncate">{title}</h3>
            {subtitle && <p className="text-xs text-white/40 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full lg-glass flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="relative z-10 overflow-y-auto custom-scrollbar overscroll-contain p-5 pt-4 pb-3 flex-1 min-h-0">
          {children}
        </div>
        {actionLabel && (
          <div className="relative z-10 px-5 pb-5 pt-1 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm active:scale-[0.98] transition-all cursor-pointer ${action}`}
            >
              {actionLabel}
            </button>
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
