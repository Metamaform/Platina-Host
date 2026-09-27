/**
 * Motion house-style, distilled from emilkowalski/skills (apple-design · animate):
 *
 * · Default to **critically damped** springs (no overshoot) for anything that
 *   merely appears/updates: `damping 1.0`, response ~0.3–0.4s.
 * · Reserve a little **bounce** (~0.8 damping) only for interactions that carry
 *   real momentum — flicks, throws, drag releases, physics toys.
 * · Enter with ease-out (fast-in, slow-settle); exit with ease-in. Never
 *   `ease-in` on an entrance, never `transition: all`.
 *
 * In the `motion` (Framer) spring API, `bounce` + `duration` map closely to
 * Apple's damping + response, so these presets stay interruptible and
 * velocity-aware by construction.
 */

/** Critically-damped default — sheets, modals, pills, tab switches. */
export const springSmooth = { type: 'spring', bounce: 0, duration: 0.35 } as const;

/** Slightly livelier, still no overshoot — nav pill, small confirmations. */
export const springSnappy = { type: 'spring', bounce: 0.08, duration: 0.32 } as const;

/** Under-damped — momentum-driven moments (flicked sheet, wheel spin landing). */
export const springBouncy = { type: 'spring', bounce: 0.22, duration: 0.42 } as const;

/** Enter curve: fast arrival, gentle settle (never ease-in on entrances). */
export const easeOut = [0.22, 1, 0.36, 1] as const;

/** Exit curve: mirror of enter, for symmetric/reversible paths. */
export const easeIn = [0.55, 0, 0.55, 0.2] as const;

/** Gentle fade for cross-fades under prefers-reduced-motion. */
export const fade = { duration: 0.18, ease: 'easeOut' } as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Apple's scroll-deceleration projection (apple-design §6): animate a flick to
 * where momentum says it is *going*, then snap to the nearest target.
 */
export function projectMomentum(initialVelocity: number, decelerationRate = 0.998): number {
  return (initialVelocity / 1000) * (decelerationRate / (1 - decelerationRate));
}

/** Progressive resistance at a boundary (apple-design §9). */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
