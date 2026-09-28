import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

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
  if (typeof document === 'undefined') return null;

  const chip =
    tone === 'amber'
      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]'
      : 'bg-brand/20 border-brand/40 text-brand shadow-[0_0_10px_rgba(0,152,234,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]';

  const action =
    tone === 'amber'
      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_4px_18px_rgba(245,158,11,0.4),inset_0_1px_0_rgba(255,255,255,0.35)]'
      : 'bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] text-white shadow-[0_4px_18px_rgba(0,152,234,0.45),inset_0_1px_0_rgba(255,255,255,0.35)]';

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-3 sm:p-4">
      <motion.button
        type="button"
        aria-label="Закрыть"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 cursor-pointer"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm max-h-[85vh] flex flex-col rounded-[28px] bg-[#17191d] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_24px_60px_-20px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_42%)]"
        />
        <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
          {icon && (
            <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${chip}`}>
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[16px] font-bold text-white leading-tight truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-white/50 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full bg-white/[0.06] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative z-10 overflow-y-auto overscroll-contain px-4 pb-2 flex-1 min-h-0">
          {children}
        </div>
        {actionLabel && (
          <div className="relative z-10 px-4 pb-4 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={`w-full py-3 rounded-full font-bold text-[14px] active:scale-[0.98] transition-transform cursor-pointer ${action}`}
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
