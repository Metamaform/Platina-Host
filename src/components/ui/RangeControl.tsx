import React, { memo, useRef, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';

interface RangeControlProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onValueCommit: (value: number) => void;
  presets?: number[];
}

export const RangeControl = memo(function RangeControl({
  value,
  min,
  max,
  step = 1,
  label,
  onValueCommit,
  presets = [1, 3, 5, 10, 15, 20, 24]
}: RangeControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Percentage for track fill and thumb placement
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const updateFromPointer = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    const clamped = Math.min(max, Math.max(min, stepped));
    onValueCommit(clamped);
  }, [min, max, step, onValueCommit]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {/* Slider Row with Minus & Plus buttons */}
      <div className="flex items-center gap-3 w-full">
        {/* Decrement Button */}
        <button
          type="button"
          onClick={() => onValueCommit(Math.max(min, value - step))}
          disabled={value <= min}
          aria-label="Decrease"
          className="w-10 h-10 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-90 border border-white/[0.10] flex items-center justify-center text-white font-bold disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 shadow-sm"
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Large Touch Slider Container */}
        <div 
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative flex-1 flex items-center h-12 cursor-pointer touch-none py-3"
          role="slider"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        >
          {/* Background Track with Fill */}
          <div className="w-full h-3 rounded-full bg-white/[0.08] relative overflow-hidden pointer-events-none border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-[#0098ea] via-[#00b4d8] to-[#00d2ff] shadow-[0_0_12px_rgba(0,152,234,0.6)]"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Large Visible Thumb with Glow */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-[3px] border-[#0098ea] shadow-[0_0_16px_rgba(0,152,234,0.8),0_2px_8px_rgba(0,0,0,0.5)] pointer-events-none flex items-center justify-center transition-transform active:scale-110"
            style={{ left: `${pct}%` }}
          >
            <div className="w-2 h-2 rounded-full bg-[#0098ea]" />
          </div>
        </div>

        {/* Increment Button */}
        <button
          type="button"
          onClick={() => onValueCommit(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="Increase"
          className="w-10 h-10 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-90 border border-white/[0.10] flex items-center justify-center text-white font-bold disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Quick Presets Row */}
      {presets && presets.length > 0 && (
        <div className="flex items-center justify-between gap-1.5 w-full pt-0.5">
          {presets.map((num) => {
            const isActive = value === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onValueCommit(num)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0098ea] to-[#00b4d8] text-white border-cyan-300/40 shadow-[0_0_12px_rgba(0,152,234,0.45)] scale-105'
                    : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white active:scale-95'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
