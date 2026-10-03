import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { springSnappy, springSmooth } from '../../lib/motion';

/* ---------------------------------------------------------------------------
 * Pressable — instant pointer-down feedback (apple-design §1).
 * Feedback lives on the press, not on release.
 * ------------------------------------------------------------------------- */
interface PressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}
export const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
  ({ children, className = '', ...rest }, ref) => (
    <button
      ref={ref}
      {...rest}
      className={`transition-transform duration-100 ${className}`}
    >
      {children}
    </button>
  )
);
Pressable.displayName = 'Pressable';

/* ---------------------------------------------------------------------------
 * Button — primary / secondary / ghost variants (GRAM pill style).
 * ------------------------------------------------------------------------- */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg' | 'sm';
  loading?: boolean;
  full?: boolean;
}
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  full,
  className = '',
  children,
  disabled,
  ...rest
}) => {
  const base =
    'relative inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:';
  const sizes = {
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-5 py-3 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };
  const variants = {
    primary: 'bg-gradient-to-r from-[#0098ea] via-[#00a8ff] to-[#00b4d8] hover:brightness-110 text-white shadow-[0_4px_22px_rgba(0,152,234,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]',
    secondary: 'lg-glass text-white',
    ghost: 'lg-glass text-white',
    danger: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:brightness-110 text-white shadow-[0_4px_20px_rgba(239,68,68,0.4)]',
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

/* ---------------------------------------------------------------------------
 * Circular action button — the GRAM Wallet hero row (icon + label).
 * ------------------------------------------------------------------------- */
export const CircleAction: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  tone?: 'brand' | 'neutral';
}> = ({ label, icon, onClick, tone = 'neutral' }) => (
  <Pressable onClick={onClick} className="flex flex-col items-center gap-2 group cursor-pointer">
    <div
      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
        tone === 'brand'
          ? 'bg-brand text-white shadow-lg shadow-brand/30 group-hover:brightness-110'
          : 'lg-glass text-[color:var(--color-text)]'
      }`}
    >
      {icon}
    </div>
    <span className="text-[12px] font-semibold text-white/80 group-hover:text-white transition-colors">
      {label}
    </span>
  </Pressable>
);

/* ---------------------------------------------------------------------------
 * Segmented — animated pill control (layout-shared highlight).
 * ------------------------------------------------------------------------- */
interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}
export function Segmented<T extends string>({ value, onChange, options, className = '' }: SegmentedProps<T>) {
  return (
    <div className={`relative flex bg-surface p-1 rounded-2xl border border-hairline ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
              active ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {active && (
              <motion.div
                layoutId="segmented-pill"
                className="absolute inset-0 rounded-xl bg-surface-3 border border-hairline-strong shadow-sm z-[-1]"
                transition={springSnappy}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * ListRow — asset / transaction row (icon + title/sub + right slot).
 * ------------------------------------------------------------------------- */
export const ListRow: React.FC<{
  icon?: React.ReactNode;
  iconTone?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  last?: boolean;
}> = ({ icon, iconTone = 'bg-white/[0.06] border border-hairline', title, subtitle, right, onClick, last }) => (
  <div
    onClick={onClick}
    className={`px-4 py-3.5 flex items-center justify-between gap-3 transition-colors ${
      onClick ? 'cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05]' : ''
    } ${last ? '' : 'border-b border-hairline'}`}
  >
    <div className="flex items-center gap-3.5 min-w-0">
      {icon && (
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconTone}`}>
          {icon}
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-white font-bold text-[15px] leading-tight truncate">{title}</span>
        {subtitle && <span className="text-muted text-[12px] font-medium mt-0.5 truncate">{subtitle}</span>}
      </div>
    </div>
    {right && <div className="flex flex-col items-end shrink-0">{right}</div>}
  </div>
);

/* ---------------------------------------------------------------------------
 * Card — rounded surface with soft translucent shadow.
 * ------------------------------------------------------------------------- */
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div {...rest} className={`premium-card ${className}`}>
    {children}
  </div>
);

/* ---------------------------------------------------------------------------
 * Toast — lightweight context-driven toast (sonner-style, top-center).
 * ------------------------------------------------------------------------- */
type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}
const ToastCtx = createContext<(message: string, tone?: ToastTone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 items-center pointer-events-none w-max max-w-[92vw]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.94 }}
              transition={springSmooth}
              className="bg-surface/95 backdrop-blur-2xl border border-hairline rounded-full px-5 py-2.5 flex items-center gap-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
            >
              {t.tone === 'success' && <CheckCircle2 className="w-4 h-4 text-positive" />}
              {t.tone === 'error' && <AlertCircle className="w-4 h-4 text-negative" />}
              {t.tone === 'info' && <Info className="w-4 h-4 text-brand" />}
              <span className="text-white text-xs font-semibold">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};
