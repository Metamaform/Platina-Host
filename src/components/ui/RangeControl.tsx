import React, { memo, useId, useRef, useState } from 'react';

interface RangeControlProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onValueCommit: (value: number) => void;
}

/**
 * Keep pointer previews local: dragging must not rerender the game, sort its
 * NFT catalog or rebuild its reward track. Commit the final value on release.
 * Native range semantics preserve arrow keys, Home/End and screen readers.
 */
export const RangeControl = memo(function RangeControl({
  value, min, max, step = 1, label, onValueCommit,
}: RangeControlProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerId = useRef<number | null>(null);
  const [draft, setDraft] = useState<number | null>(null);

  const finish = () => {
    if (pointerId.current === null) return;
    const activePointer = pointerId.current;
    pointerId.current = null;
    const input = inputRef.current;
    const nextValue = input ? Number(input.value) : value;
    setDraft(null);
    onValueCommit(nextValue);
    if (input?.hasPointerCapture(activePointer)) {
      input.releasePointerCapture(activePointer);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <output
        htmlFor={id}
        className="bg-black/40 px-4 py-1.5 rounded-full text-white font-bold font-display text-[15px] w-14 shrink-0 text-center tabular-nums"
      >
        {draft ?? value}
      </output>
      <input
        ref={inputRef}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft ?? value}
        aria-label={label}
        className="range-control flex-1 min-w-0"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || pointerId.current !== null) return;
          pointerId.current = event.pointerId;
          setDraft(Number(event.currentTarget.value));
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onChange={(event) => {
          const nextValue = Number(event.currentTarget.value);
          if (pointerId.current !== null) setDraft(nextValue);
          else onValueCommit(nextValue);
        }}
        onPointerUp={(event) => { if (event.pointerId === pointerId.current) finish(); }}
        onPointerCancel={(event) => { if (event.pointerId === pointerId.current) finish(); }}
        onLostPointerCapture={(event) => { if (event.pointerId === pointerId.current) finish(); }}
        onBlur={finish}
      />
    </div>
  );
});
