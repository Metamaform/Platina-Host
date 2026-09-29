/*
  arenaPlatform — чистая геометрия «платформы взлёта» AICE ARENA
  (без React, чтобы её можно было проверять тестами и использовать в
  превью-скриптах).

  Платформа — кубическая кривая Безье «стартовая полоса»: плоский
  разбег снизу слева → набор высоты → крутой взлёт в правый верхний
  угол (та же сигнатура, что у траектории ракеты в Rocket). По длине
  дуги делятся территории игроков: доля сегмента = вклад / Σ вклад,
  порядок сегментов = порядок round.participants (тот же, что обходит
  сервер в pickWinner). Позиция любого объекта на платформе задаётся
  долей 0..1 от длины дуги.
*/

import type { ArenaParticipant } from '../../lib/arenaShared';

export type Pt = { x: number; y: number };

/** Контрольные точки кривой в нормализованных координатах (0..1). */
export const PLATFORM_CURVE: Pt[] = [
  { x: 0.055, y: 0.80 },
  { x: 0.42, y: 0.80 },
  { x: 0.72, y: 0.62 },
  { x: 0.965, y: 0.13 },
];

export const PLATFORM_SAMPLES = 480;

export function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

export interface PlatformGeo {
  /** длина дуги, px */
  total: number;
  /** готовый SVG path целиком (для strokeDasharray-сегментов) */
  d: string;
  /** точка на дуге по доле длины (0..1) + угол касательной, градусы (экран: y вниз) */
  pointAt(frac: number): { x: number; y: number; angle: number };
}

export function buildPlatformCurve(width: number, height: number): PlatformGeo {
  const P = PLATFORM_CURVE.map((p) => ({ x: p.x * width, y: p.y * height }));
  const pts: Pt[] = [];
  for (let i = 0; i <= PLATFORM_SAMPLES; i++) {
    pts.push(cubic(P[0], P[1], P[2], P[3], i / PLATFORM_SAMPLES));
  }
  // pos[k] — длина дуги от старта до pts[k] (pos.length === pts.length)
  const pos: number[] = [0];
  for (let i = 1; i <= PLATFORM_SAMPLES; i++) {
    pos.push(pos[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = pos[PLATFORM_SAMPLES];

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i <= PLATFORM_SAMPLES; i += 3) d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  d += ` L ${pts[PLATFORM_SAMPLES].x.toFixed(1)} ${pts[PLATFORM_SAMPLES].y.toFixed(1)}`;

  const pointAt = (frac: number) => {
    const f = Math.max(0, Math.min(1, frac));
    const target = f * total;
    // первое k, для которого pos[k] >= target
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pos[mid] < target) lo = mid + 1; else hi = mid;
    }
    const i1 = Math.min(lo, pts.length - 1);
    const i0 = Math.max(0, i1 - 1);
    const segLen = pos[i1] - pos[i0] || 1;
    const t = Math.max(0, Math.min(1, (target - pos[i0]) / segLen));
    const a = pts[i0], b = pts[i1];
    const xa = pts[Math.max(0, i0 - 1)], xb = pts[Math.min(PLATFORM_SAMPLES, i1 + 1)];
    const angle = (Math.atan2(xb.y - xa.y, xb.x - xa.x) * 180) / Math.PI;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle };
  };

  return { total, d, pointAt };
}

// ---------------------------------------------------------------------------
// Территории участников
// ---------------------------------------------------------------------------

export interface PlatformSegment {
  participant: ArenaParticipant;
  idx: number;
  color: string;
  /** начало сегмента по длине дуги, px (для strokeDashoffset) */
  dashStart: number;
  /** длина видимой части, px (зазоры уже вычтены) */
  dashLen: number;
  /** полная длина сегмента без зазоров, px (для порогов подписей) */
  lenPx: number;
  /** середина сегмента на дуге */
  mid: { x: number; y: number; angle: number };
}

export interface PlatformLayout {
  geo: PlatformGeo;
  segs: PlatformSegment[];
  /** Σ вклад участников (мера для долей) */
  sumC: number;
}

/** Цвета территорий (до 8 игроков — каждому свой оттенок). */
export const SEGMENT_COLORS = [
  '#0098ea', // cyan (бренд)
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#d946ef', // fuchsia
  '#84cc16', // lime
];

/** Зазор по краям сегмента, px (видна тёмная палуба — «швы» полосы). */
export const SEGMENT_GAP_PX = 3;

export function buildPlatformLayout(
  width: number,
  height: number,
  participants: ArenaParticipant[],
): PlatformLayout {
  const geo = buildPlatformCurve(width, height);
  const sumC = participants.reduce((s, p) => s + p.contribution, 0);
  let acc = 0;
  const segs: PlatformSegment[] = participants.map((p, idx) => {
    const from = sumC > 0 ? acc / sumC : idx / Math.max(1, participants.length);
    acc += p.contribution;
    const to = sumC > 0 ? Math.min(1, acc / sumC) : (idx + 1) / Math.max(1, participants.length);
    const gapFrac = SEGMENT_GAP_PX / geo.total;
    const sFrac = Math.max(0, from + gapFrac);
    const eFrac = Math.min(1, to - gapFrac);
    const startLen = from * geo.total;
    const segLenPx = Math.max(0, to - from) * geo.total;
    const mid = geo.pointAt((from + to) / 2);
    return {
      participant: p,
      idx,
      color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
      dashStart: startLen,
      dashLen: Math.max(0, (eFrac - sFrac) * geo.total),
      lenPx: segLenPx,
      mid,
    };
  });
  return { geo, segs, sumC };
}

/** Доля длины дуги, на которой лежит билет (ticket / Σ вклад), 0..1. */
export function ticketToFrac(ticket: number, sumC: number): number {
  if (sumC <= 0) return 0;
  return Math.max(0, Math.min(1, ticket / sumC));
}
