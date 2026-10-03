import React, { useEffect, useRef, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from 'motion/react';
import { X } from 'lucide-react';
import { springSmooth, easeIn, projectMomentum, rubberband } from '../../lib/motion';
import { haptics } from '../../lib/haptics';
import { useTranslation } from '../../lib/i18n';

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
  const { t } = useTranslation();
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

  useEffect(() => {
    const measure = () => {
      if (sheetRef.current) heightRef.current = sheetRef.current.offsetHeight;
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (sheetRef.current) observer.observe(sheetRef.current);
    return () => observer.disconnect();
  }, []);

  // Entrance spring (interruptible; exit below uses the inverse path).
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const h = el.offsetHeight || 500;
    // Start from below the screen and spring up.
    y.set(h);
    animate(y, 0, { ...springSmooth, duration: 0.4 });
    return () => y.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dragState = useRef<{
    pointerId: number | null;
    startY: number;
    startOffset: number;
    lastY: number;
    lastT: number;
    velocity: number;
  }>({ pointerId: null, startY: 0, startOffset: 0, lastY: 0, lastT: 0, velocity: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!e.isPrimary || e.button !== 0 || dragState.current.pointerId !== null) return;
      if (!target.closest('[data-sheet-drag-handle]')) return;
      if (target.closest('input,textarea,select,button,a,[data-nodrag]')) return;
      // Cancel the entrance/snap-back spring so it cannot fight the pointer.
      y.stop();
      const h = heightRef.current || 500;
      const current = y.get();
      // Undo resistance before applying it again in onPointerMove. This keeps
      // an interrupted upward snap-back continuous as well as downward drags.
      const startOffset = current < 0
        ? current * h / (0.55 * (h - Math.abs(current)))
        : current;
      dragState.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startOffset,
        lastY: e.clientY,
        lastT: performance.now(),
        velocity: 0,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [y]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const st = dragState.current;
    if (st.pointerId !== e.pointerId) return;
    const now = performance.now();
    const dt = Math.max(1, now - st.lastT);
    const instV = ((e.clientY - st.lastY) / dt) * 1000;
    st.velocity = st.velocity * 0.7 + instV * 0.3;
    st.lastY = e.clientY;
    st.lastT = now;

    let offset = st.startOffset + e.clientY - st.startY;
    const h = heightRef.current || 500;
    if (offset < 0) offset = rubberband(offset, h);
    y.set(Math.max(offset, -h * 0.4));
  }, [y]);

  const finishDrag = useCallback(
    (e: React.PointerEvent, cancelled = false) => {
      const st = dragState.current;
      if (st.pointerId !== e.pointerId) return;
      st.pointerId = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const h = heightRef.current || 500;
      // A flick followed by a pause is a hold, not a fast dismissal.
      const velocity = cancelled || performance.now() - st.lastT > 100 ? 0 : st.velocity;
      const projected = y.get() + projectMomentum(velocity);
      const shouldClose = !cancelled && (velocity > 400 || projected > h * 0.45);

      if (shouldClose) {
        haptics.impact('light');
        animate(y, h + 60, {
          type: 'spring', bounce: 0, duration: 0.32, velocity,
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
        style={{ y, willChange: 'transform' }}
        exit={{ y: '110%', transition: { duration: 0.22, ease: easeIn } }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishDrag(e)}
        onPointerCancel={(e) => finishDrag(e, true)}
        onLostPointerCapture={(e) => finishDrag(e, true)}
        className="bottom-sheet relative w-full max-w-md bg-[#18181b]/95 border-t sm:border border-white/[0.08] rounded-t-[26px] sm:rounded-[26px] text-white shadow-[0_-12px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden flex flex-col"
      >
        {/* Grab handle */}
        <div data-sheet-drag-handle className="pt-2 pb-3 touch-none select-none cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1.5 bg-white/25 rounded-full mx-auto" />
        </div>

        {(title || icon) && (
          <div data-sheet-drag-handle className="px-5 pt-1 pb-3.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 touch-none select-none cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-3 min-w-0">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="min-w-0">
                {title && <h2 className="font-display text-lg font-bold tracking-tight truncate">{title}</h2>}
                {subtitle && <p className="text-[11px] text-white/50 mt-0.5 truncate">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={t("close")}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          className="overflow-y-auto overscroll-contain custom-scrollbar p-5 pt-4 flex-1 min-h-0"
          style={{ maxHeight, paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
          data-nodrag
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
};
