import React, { useRef } from 'react';
import { prefersReducedMotion } from '../../lib/motion';

export interface LiquidOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface LiquidSegmentProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: LiquidOption<T>[];
  /** nav = кружок-иконка и подпись, как нижнее меню. text = компактные подписи. */
  variant?: 'nav' | 'text';
  className?: string;
  disabled?: boolean;
  /** Пролистывание пальцем по пунктам, как у нижнего меню. */
  dragSelect?: boolean;
  ariaLabel?: string;
}

/**
 * Сегмент в том же языке, что и нижнее меню:
 * тёмная стеклянная дорожка, скользящая жидкая пилюля (CSS transform, без layout),
 * активный пункт — белый текст и брендовый чип.
 * Пилюля двигается transform'ом, чтобы не ждать пересчёта layout.
 */
export function LiquidSegment<T extends string>({
  value,
  onChange,
  options,
  variant = 'text',
  className = '',
  disabled,
  dragSelect,
  ariaLabel,
}: LiquidSegmentProps<T>) {
  const count = Math.max(1, options.length);
  const found = options.findIndex((opt) => opt.value === value);
  const hasSelection = found >= 0;
  const index = hasSelection ? found : 0;
  const dragging = useRef(false);
  const pad = variant === 'nav' ? 6 : 4;
  const reduce = prefersReducedMotion();

  const select = (next: T) => {
    if (disabled || next === value) return;
    onChange(next);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onPointerLeave={() => { dragging.current = false; }}
      className={`relative flex items-stretch ${variant === 'nav' ? 'p-1.5' : 'p-1'} rounded-full bg-[#17191d]/92 border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_-14px_rgba(0,0,0,0.8)] select-none touch-manipulation ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_40%,transparent_62%)]"
      />
      {hasSelection && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full overflow-hidden border border-white/[0.16] bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.035)_55%,rgba(255,255,255,0.08))] shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-2px_5px_rgba(255,255,255,0.04),0_5px_12px_-5px_rgba(0,0,0,0.65)] will-change-transform"
          style={{
            top: pad,
            bottom: pad,
            left: pad,
            width: `calc((100% - ${pad * 2}px) / ${count})`,
            transform: `translate3d(${index * 100}%, 0, 0)`,
            transition: reduce ? 'none' : 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <span className="pointer-events-none absolute inset-x-2 top-0.5 h-[42%] rounded-full bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.16),transparent_70%)]" />
          <span className="pointer-events-none absolute bottom-0 left-2 w-8 h-5 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.32),transparent_72%)]" />
        </div>
      )}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => select(opt.value)}
            onPointerDown={() => {
              if (!dragSelect || disabled) return;
              dragging.current = true;
            }}
            onPointerEnter={(event) => {
              if (dragSelect && dragging.current && event.buttons === 1) select(opt.value);
            }}
            className={`relative z-10 flex-1 min-w-0 outline-none cursor-pointer active:scale-[0.97] transition-transform duration-100 disabled:cursor-not-allowed disabled:opacity-45 ${
              variant === 'nav' ? 'py-2 px-0.5' : 'py-2 px-1.5'
            }`}
          >
            {variant === 'nav' ? (
              <span className="flex flex-col items-center justify-center gap-1">
                <span
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
                    active
                      ? 'bg-brand/20 border border-brand/40 text-brand shadow-[0_0_10px_rgba(0,152,234,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'bg-white/[0.06] border border-white/[0.08] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                  }`}
                >
                  {opt.icon}
                </span>
                <span
                  className={`text-[10.5px] font-semibold tracking-tight leading-none text-center max-w-full truncate px-0.5 text-white ${
                    active ? 'opacity-100 font-bold' : 'opacity-70'
                  }`}
                >
                  {opt.label}
                </span>
              </span>
            ) : (
              <span
                className={`flex items-center justify-center gap-1.5 text-[12.5px] font-bold leading-none ${
                  active ? 'text-white' : 'text-white/55'
                }`}
              >
                {opt.icon && <span className="shrink-0 flex items-center justify-center">{opt.icon}</span>}
                <span className="truncate">{opt.label}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
