/*
  Локальный таймер раунда: считается по серверному endsAt + смещению часов,
  чтобы у всех игроков цифра была одинаковой. Обновляется только при
  изменении отображаемого значения — без лишних ре-рендеров.
*/

import { useEffect, useRef, useState } from 'react';
import type { ArenaRoundState } from '../../lib/arenaShared';

export interface ArenaCountdown {
  /** секунд до закрытия ставок (0 — уже закрыты) */
  secondsLeft: number | null;
  /** миллисекунд до закрытия */
  msLeft: number;
  /** 0..1 — доля оставшегося времени окна ставок */
  progress: number;
}

export function useArenaCountdown(round: ArenaRoundState | null, serverOffset: number): ArenaCountdown {
  const [state, setState] = useState<ArenaCountdown>({ secondsLeft: null, msLeft: 0, progress: 1 });
  const lastSecondRef = useRef(-1);

  useEffect(() => {
    if (!round || round.status !== 'ACCEPTING_BETS' || !round.endsAt) {
      lastSecondRef.current = -1;
      setState({ secondsLeft: null, msLeft: 0, progress: 1 });
      return;
    }

    const bettingMs = 25_000;
    let raf = 0;
    let lastFrame = 0;

    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      // тяжёлых пересчётов не нужно: не чаще 4 раз в секунду
      if (ts - lastFrame < 240) return;
      lastFrame = ts;

      const msLeft = Math.max(0, round.endsAt! - (Date.now() + serverOffset));
      const secondsLeft = Math.ceil(msLeft / 1000);
      const progress = Math.max(0, Math.min(1, msLeft / bettingMs));

      if (secondsLeft !== lastSecondRef.current) {
        lastSecondRef.current = secondsLeft;
        setState({ secondsLeft, msLeft, progress });
      } else {
        // прогресс-бар обновляем без перерисовки второй цифры
        setState((prev) => (Math.abs(prev.progress - progress) > 0.004 ? { ...prev, progress } : prev));
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [round, serverOffset]);

  return state;
}
