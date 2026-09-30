/*
  arenaPlatform — чистая геометрия «платформы взлёта» AICE ARENA
  (без React, чтобы её можно было проверять тестами и использовать в
  превью-скриптах).

  Платформа — кубическая кривая Безье «стартовая полоса»: плоский
  разбег снизу слева → набор высоты → крутой взлёт в правый верхний
  угол. По длине дуги делятся территории игроков.

  При больших ставках мелкие ставки защищены минимальной визуальной квотой
  (smart min-slice allocation), чтобы ни один игрок с любым процентом
  не исчезал с поля, а шарик гарантированно садился внутрь видимой территории
  победителя.
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
  /** визуальная начальная доля 0..1 */
  visFrom: number;
  /** визуальная конечная доля 0..1 */
  visTo: number;
}

export interface PlatformLayout {
  geo: PlatformGeo;
  segs: PlatformSegment[];
  /** Σ вклад участников (мера для долей) */
  sumC: number;
  /** Отображение билета победителя в позицию на дуге (0..1) */
  ticketToFrac: (ticket: number) => number;
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
export const SEGMENT_GAP_PX = 2.5;

export function buildPlatformLayout(
  width: number,
  height: number,
  participants: ArenaParticipant[],
): PlatformLayout {
  const geo = buildPlatformCurve(width, height);
  const sumC = participants.reduce((s, p) => s + (p.contribution || 0), 0);
  const n = participants.length;

  if (n === 0) {
    return {
      geo,
      segs: [],
      sumC: 0,
      ticketToFrac: () => 0,
    };
  }

  // Расчёт сырых долей
  const rawFractions = participants.map((p, idx) => {
    if (sumC > 0) return Math.max(0, p.contribution) / sumC;
    return 1 / n;
  });

  // Минимальная визуальная доля (5-6% от полосы), чтобы мелкие игроки
  // не растворялись в 0 px при ставках-гигантах.
  const minFrac = n > 1 ? Math.min(0.065, 0.85 / n) : 1;

  let smallCount = 0;
  let largeSum = 0;
  for (const r of rawFractions) {
    if (r < minFrac) smallCount++;
    else largeSum += r;
  }

  const smallAllocated = smallCount * minFrac;
  const remainingForLarge = Math.max(0.001, 1 - smallAllocated);

  const visFractions = rawFractions.map((r) => {
    if (n === 1) return 1;
    if (r < minFrac) return minFrac;
    return largeSum > 0 ? (r / largeSum) * remainingForLarge : r;
  });

  // Нормализуем сумму до точно 1
  const visSum = visFractions.reduce((s, v) => s + v, 0);
  const normVis = visFractions.map((v) => (visSum > 0 ? v / visSum : 1 / n));

  // Границы сегментов в координатах дуги
  const visBounds: { from: number; to: number }[] = [];
  const rawBounds: { from: number; to: number }[] = [];
  let visAcc = 0;
  let rawAcc = 0;

  for (let i = 0; i < n; i++) {
    const vf = normVis[i];
    const rf = rawFractions[i];
    const vFrom = visAcc;
    visAcc = Math.min(1, visAcc + vf);
    const vTo = i === n - 1 ? 1 : visAcc;
    visBounds.push({ from: vFrom, to: vTo });

    const rFrom = rawAcc;
    rawAcc = Math.min(1, rawAcc + rf);
    const rTo = i === n - 1 ? 1 : rawAcc;
    rawBounds.push({ from: rFrom, to: rTo });
  }

  const segs: PlatformSegment[] = participants.map((p, idx) => {
    const { from: vFrom, to: vTo } = visBounds[idx];
    const segLenPx = Math.max(0, vTo - vFrom) * geo.total;

    // Симметричный центрированный зазор между сегментами
    const gapPx = n > 1 ? Math.min(SEGMENT_GAP_PX, segLenPx * 0.12) : 0;
    const dashStart = vFrom * geo.total + gapPx / 2;
    const dashLen = Math.max(1.5, segLenPx - gapPx);
    const mid = geo.pointAt((vFrom + vTo) / 2);

    return {
      participant: p,
      idx,
      color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
      dashStart,
      dashLen,
      lenPx: segLenPx,
      mid,
      visFrom: vFrom,
      visTo: vTo,
    };
  });

  const ticketToFracLayout = (ticket: number): number => {
    if (sumC <= 0 || n === 0) return 0;
    const t = Math.max(0, Math.min(sumC, ticket));

    // Находим победителя по правилу pickWinner: первый, у кого acc > ticket
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const startC = acc;
      acc += participants[i].contribution;
      const endC = acc;
      if (t <= endC || i === n - 1) {
        const segC = Math.max(1e-9, endC - startC);
        const rel = Math.max(0, Math.min(1, (t - startC) / segC));
        const vb = visBounds[i];
        return vb.from + rel * (vb.to - vb.from);
      }
    }
    return 1;
  };

  return {
    geo,
    segs,
    sumC,
    ticketToFrac: ticketToFracLayout,
  };
}

/** Доля длины дуги, на которой лежит билет (ticket / Σ вклад), 0..1. */
export function ticketToFrac(ticket: number, sumC: number): number {
  if (sumC <= 0) return 0;
  return Math.max(0, Math.min(1, ticket / sumC));
}
