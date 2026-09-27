import React, { useEffect, useRef, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  MotionValue,
} from 'motion/react';
import { X } from 'lucide-react';
import { springSmooth, easeIn, projectMomentum, rubberband } from '../../lib/motion';
import { haptics } from '../../lib/haptics';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** max height of the sheet body */
  maxHeight?: string;
  z?: number;
}

/**
 * GRAM-Wallet style bottom sheet.
 *
 * Follows emilkowalski/skills "apple-design":
 * · enters/exists along the same vertical path (spatial consistency);
 * · drag is 1:1 with the finger and interruptible mid-flight (springs start
 *   from the live value, never the target);
 * · on release we hand the pointer's velocity to the spring and use Apple's
 *   momentum projection to decide close-vs-snap-back by velocity, not position;
 * · dragging past the top edge rubber-bands instead of hard-stopping.
 */
export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxHeight = '88vh',
  z = 120,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <SheetInner
          key="sheet"
          onClose={onClose}
          title={title}
          subtitle={subtitle}
          icon={icon}
          maxHeight={maxHeight}
          z={z}
        >
          {children}
        </SheetInner>
      )}
    </AnimatePresence>
  );
};

interface InnerProps extends Omit<SheetProps, 'open'> {}

const SheetInner: React.FC<InnerProps> = ({
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxHeight,
  z,
}) => {
  const y = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(0);

  // Scrim + parent push-back driven by drag position (materials & depth).
  const scrimOpacity = useTransform(
    y,
    [0, 400],
    [1, 0],
    { clamp: true }
  );
  const sheetScale = useTransform(y, [0, 500], [1, 0.96], { clamp: true });

  useEffect(() => {
    const measure = () => {
      if (sheetRef.current) heightRef.current = sheetRef.current.offsetHeight;
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Entrance spring (interruptible; exit below uses the inverse path).
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const h = el.offsetHeight || 500;
    // Start from below the screen and spring up.
    y.set(h);
    animate(y, 0, { ...springSmooth, duration: 0.4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dragState = useRef<{
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
    dragging: boolean;
  }>({ startY: 0, lastY: 0, lastT: 0, velocity: 0, dragging: false });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only initiate drag from the grab zone (handle/header), not from inputs.
      const target = e.target as HTMLElement;
      if (target.closest('input,textarea,select,button,a,[data-nodrag]')) return;
      dragState.current.dragging = true;
      dragState.current.startY = e.clientY;
      dragState.current.lastY = e.clientY;
      dragState.current.lastT = performance.now();
      dragState.current.velocity = 0;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    []
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st.dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - st.lastT);
    const dy = e.clientY - st.lastY;
    const instV = (dy / dt) * 1000; // px/s
    // Smooth the velocity for a stable release value.
    st.velocity = st.velocity * 0.7 + instV * 0.3;
    st.lastY = e.clientY;
    st.lastT = now;

    let offset = e.clientY - st.startY;
    const h = heightRef.current || 500;
    // Resistance above the resting position (rubber band), free below.
    if (offset < 0) offset = rubberband(offset, h);
    y.set(Math.max(offset, -h * 0.4));
  }, [y]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const st = dragState.current;
      if (!st.dragging) return;
      st.dragging = false;
      const h = heightRef.current || 500;
      const current = y.get();
      const velocity = st.velocity;

      // Momentum projection: where is this flick going?
      const projected = current + projectMomentum(velocity);
      const shouldClose = velocity > 400 || projected > h * 0.45;

      if (shouldClose) {
        haptics.impact('light');
        // Hand the release velocity to the exit spring (velocity handoff).
        animate(y, h + 60, {
          type: 'spring',
          bounce: 0,
          duration: 0.32,
          velocity,
          onComplete: onClose,
        });
      } else {
        animate(y, 0, { type: 'spring', bounce: 0.18, duration: 0.4, velocity });
      }
    },
    [y, onClose]
  );

  return (
    <div
      className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4"
      style={{ zIndex: z }}
      data-sheet-root
    >
      {/* Dimming scrim, opacity tied to drag */}
      <motion.div
        style={{ opacity: scrimOpacity }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        style={{ y, scale: sheetScale, transformOrigin: 'bottom center' }}
        exit={{ y: '110%', transition: { duration: 0.28, ease: easeIn } }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative w-full max-w-md bg-surface border-t sm:border border-hairline rounded-t-[28px] sm:rounded-[28px] text-[color:var(--color-text)] shadow-[0_-12px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col touch-none"
      >
        {/* Grab handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden cursor-grab active:cursor-grabbing" />

        {(title || icon) && (
          <div className="px-5 pt-3 pb-3 border-b border-hairline flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-3 min-w-0">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="min-w-0">
                {title && <h2 className="font-display text-lg font-bold tracking-tight truncate">{title}</h2>}
                {subtitle && <p className="text-[11px] text-muted mt-0.5 truncate">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          className="overflow-y-auto custom-scrollbar p-5 pt-4 flex-1"
          style={{ maxHeight }}
          data-nodrag
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
};
