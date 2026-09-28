import React, { memo, useId, useRef, useEffect, useCallback } from 'react';

interface RangeControlProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onValueCommit: (value: number) => void;
}

/**
 * Ultra-light range control:
 * - Uses refs during drag to avoid React re-renders of parent game state
 * - Only commits value on pointer up (final value)
 * - Direct DOM manipulation for the value display during drag (0 parent re-renders)
 * - Syncs input value from props when not dragging (external changes)
 */
export const RangeControl = memo(function RangeControl({
  value, min, max, step = 1, label, onValueCommit,
}: RangeControlProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLOutputElement>(null);
  const draggingRef = useRef(false);

  const updateOutput = useCallback((next: number) => {
    if (outputRef.current) {
      outputRef.current.textContent = String(next);
    }
  }, []);

  // Sync input value from props when external value changes (and we aren't dragging)
  useEffect(() => {
    if (!draggingRef.current && inputRef.current) {
      inputRef.current.value = String(value);
    }
    updateOutput(value);
  }, [value, updateOutput]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLInputElement>) => {
    if (!event.isPrimary || event.button !== 0 || draggingRef.current) return;
    draggingRef.current = true;
    const el = event.currentTarget;
    try { el.setPointerCapture(event.pointerId); } catch {}
    updateOutput(Number(el.value));
  }, [updateOutput]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.currentTarget.value);
    if (draggingRef.current) {
      // During drag: update DOM display only, NO React commit to parent
      updateOutput(next);
    } else {
      // Keyboard / click (no pointer drag): commit immediately
      onValueCommit(next);
    }
  }, [onValueCommit, updateOutput]);

  const finish = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const input = inputRef.current;
    const nextValue = input ? Number(input.value) : value;
    const stepped = Math.round((nextValue - min) / step) * step + min;
    const clamped = Math.max(min, Math.min(max, stepped));
    if (input) input.value = String(clamped);
    updateOutput(clamped);
    onValueCommit(clamped);
  }, [value, min, max, step, onValueCommit, updateOutput]);

  return (
    <div className="flex items-center gap-4 gpu-layer">
      <output
        ref={outputRef}
        htmlFor={id}
        className="bg-black/40 px-3 py-1.5 rounded-full text-white font-bold font-display text-[15px] w-14 shrink-0 text-center tabular-nums select-none"
      >
        {value}
      </output>
      <input
        ref={inputRef}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        aria-label={label}
        className="range-control flex-1 min-w-0"
        onPointerDown={handlePointerDown}
        onChange={handleChange}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
        onBlur={finish}
      />
    </div>
  );
});
