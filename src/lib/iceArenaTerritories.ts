export interface IceArenaTerritoryParticipant {
  id: string;
  contribution: number;
}

export interface IceArenaPoint {
  x: number;
  y: number;
}

export interface IceArenaTerritoryNode<T extends IceArenaTerritoryParticipant = IceArenaTerritoryParticipant> {
  participant: T;
  points: IceArenaPoint[];
  pointsStr: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Визуальная площадь в процентах от всей арены. */
  areaPct: number;
}

export interface IceArenaMapSize {
  width: number;
  height: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WeightedPlayer<T extends IceArenaTerritoryParticipant> {
  participant: T;
  share: number;
}

const DEFAULT_MAP_SIZE: IceArenaMapSize = { width: 360, height: 270 };
const MIN_VISUAL_SHARE = 0.06;

/** A small deterministic PRNG for stable per-round player placement. */
export function createIceArenaRandom(seed: string | number): () => number {
  const value = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  let state = hash >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Randomize which player owns each spatial slot without changing their stake,
 * odds, or the contribution-based territory size. The result is stable for a
 * round seed, so React rerenders do not reshuffle players across the board.
 */
export function shuffleIceArenaTerritoryPlayers<T extends IceArenaTerritoryParticipant>(
  players: readonly T[],
  seed: string | number,
): T[] {
  return players
    .map((participant) => ({
      participant,
      rank: createIceArenaRandom(`${seed}:${participant.id}`)(),
    }))
    .sort((a, b) => a.rank - b.rank || a.participant.id.localeCompare(b.participant.id))
    .map(({ participant }) => participant);
}

function finiteContribution(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Allocate a visible area for every player while preserving proportionality
 * for bets that are large enough to be shown at their natural size. This is a
 * presentation-only floor; the displayed percentage and winner odds remain
 * based on the real contribution.
 */
function allocateVisualShares<T extends IceArenaTerritoryParticipant>(players: readonly T[]): number[] {
  const count = players.length;
  if (count === 0) return [];
  if (count === 1) return [1];

  // Scale first so even unusually large contributions cannot overflow the sum.
  const contributions = players.map((player) => finiteContribution(Number(player.contribution)));
  const maxContribution = Math.max(...contributions);
  const weights = maxContribution > 0
    ? contributions.map((contribution) => contribution / maxContribution)
    : contributions.map(() => 1);
  const minShare = Math.min(MIN_VISUAL_SHARE, 0.8 / count);
  const shares = new Array<number>(count).fill(0);
  let remainingShare = 1;
  let active = players.map((_, index) => index);

  while (active.length > 0) {
    const weightTotal = active.reduce((sum, index) => sum + weights[index], 0);
    if (weightTotal <= 0) {
      const equalShare = remainingShare / active.length;
      for (const index of active) shares[index] = equalShare;
      break;
    }

    const belowFloor = active.filter((index) => (weights[index] / weightTotal) * remainingShare < minShare);
    if (belowFloor.length === 0) {
      for (const index of active) shares[index] = (weights[index] / weightTotal) * remainingShare;
      break;
    }

    const fixed = new Set(belowFloor);
    for (const index of belowFloor) {
      shares[index] = minShare;
      remainingShare -= minShare;
    }
    active = active.filter((index) => !fixed.has(index));
  }

  // Eliminate tiny floating-point drift so the final territory closes exactly.
  const sum = shares.reduce((total, share) => total + share, 0);
  shares[shares.length - 1] += 1 - sum;
  return shares;
}

function polygonArea(points: readonly IceArenaPoint[]): number {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) / 2;
}

function polygonCentroid(points: readonly IceArenaPoint[]): IceArenaPoint {
  let twiceArea = 0;
  let x = 0;
  let y = 0;

  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    x += (current.x + next.x) * cross;
    y += (current.y + next.y) * cross;
  }

  if (Math.abs(twiceArea) < 1e-8) {
    return points.reduce(
      (center, point) => ({ x: center.x + point.x / points.length, y: center.y + point.y / points.length }),
      { x: 0, y: 0 },
    );
  }

  return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) };
}

function makeNode<T extends IceArenaTerritoryParticipant>(
  participant: T,
  points: IceArenaPoint[],
): IceArenaTerritoryNode<T> {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const center = polygonCentroid(points);

  return {
    participant,
    points,
    pointsStr: points.map((point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(' '),
    cx: center.x,
    cy: center.y,
    w: maxX - minX,
    h: maxY - minY,
    areaPct: polygonArea(points) / 100,
  };
}

/**
 * Divide the 100×100 arena into adjacent, convex territories. The partition
 * uses the measured aspect ratio to avoid long, unreadable strips on portrait
 * screens and a small visual minimum so low-probability players stay visible.
 */
export function computeIceArenaTerritories<T extends IceArenaTerritoryParticipant>(
  players: readonly T[],
  mapSize: IceArenaMapSize = DEFAULT_MAP_SIZE,
): IceArenaTerritoryNode<T>[] {
  if (players.length === 0) return [];

  const shares = allocateVisualShares(players);
  const weightedPlayers: WeightedPlayer<T>[] = players.map((participant, index) => ({
    participant,
    share: shares[index],
  }));
  const safeWidth = Number.isFinite(mapSize.width) && mapSize.width > 0 ? mapSize.width : DEFAULT_MAP_SIZE.width;
  const safeHeight = Number.isFinite(mapSize.height) && mapSize.height > 0 ? mapSize.height : DEFAULT_MAP_SIZE.height;

  const split = (items: WeightedPlayer<T>[], box: Box, depth: number): IceArenaTerritoryNode<T>[] => {
    if (items.length === 1) {
      const { participant } = items[0];
      return [makeNode(participant, [
        { x: box.x, y: box.y },
        { x: box.x + box.w, y: box.y },
        { x: box.x + box.w, y: box.y + box.h },
        { x: box.x, y: box.y + box.h },
      ])];
    }

    const totalShare = items.reduce((sum, item) => sum + item.share, 0);
    let bestIndex = 1;
    let closestToHalf = Infinity;
    let accumulated = 0;

    for (let index = 0; index < items.length - 1; index++) {
      accumulated += items[index].share;
      const difference = Math.abs(accumulated - totalShare / 2);
      if (difference < closestToHalf) {
        closestToHalf = difference;
        bestIndex = index + 1;
      }
    }

    const firstGroup = items.slice(0, bestIndex);
    const secondGroup = items.slice(bestIndex);
    const firstShare = firstGroup.reduce((sum, item) => sum + item.share, 0);
    const ratio = Math.max(1e-6, Math.min(1 - 1e-6, firstShare / totalShare));
    const splitAlongX = box.w * safeWidth >= box.h * safeHeight;

    // For a one-on-one split, use a shallow diagonal seam without changing
    // either player's allocated area.
    if (firstGroup.length === 1 && secondGroup.length === 1) {
      if (splitAlongX) {
        const maxTilt = Math.min(ratio, 1 - ratio) * box.w * 0.28;
        const tilt = (depth % 2 === 0 ? 1 : -1) * maxTilt;
        const topCut = Math.max(box.x, Math.min(box.x + box.w, box.x + box.w * ratio - tilt));
        const bottomCut = Math.max(box.x, Math.min(box.x + box.w, box.x + box.w * ratio + tilt));
        return [
          makeNode(firstGroup[0].participant, [
            { x: box.x, y: box.y },
            { x: topCut, y: box.y },
            { x: bottomCut, y: box.y + box.h },
            { x: box.x, y: box.y + box.h },
          ]),
          makeNode(secondGroup[0].participant, [
            { x: topCut, y: box.y },
            { x: box.x + box.w, y: box.y },
            { x: box.x + box.w, y: box.y + box.h },
            { x: bottomCut, y: box.y + box.h },
          ]),
        ];
      }

      const maxTilt = Math.min(ratio, 1 - ratio) * box.h * 0.28;
      const tilt = (depth % 2 === 0 ? 1 : -1) * maxTilt;
      const leftCut = Math.max(box.y, Math.min(box.y + box.h, box.y + box.h * ratio - tilt));
      const rightCut = Math.max(box.y, Math.min(box.y + box.h, box.y + box.h * ratio + tilt));
      return [
        makeNode(firstGroup[0].participant, [
          { x: box.x, y: box.y },
          { x: box.x + box.w, y: box.y },
          { x: box.x + box.w, y: rightCut },
          { x: box.x, y: leftCut },
        ]),
        makeNode(secondGroup[0].participant, [
          { x: box.x, y: leftCut },
          { x: box.x + box.w, y: rightCut },
          { x: box.x + box.w, y: box.y + box.h },
          { x: box.x, y: box.y + box.h },
        ]),
      ];
    }

    let firstBox: Box;
    let secondBox: Box;
    if (splitAlongX) {
      const firstWidth = box.w * ratio;
      firstBox = { x: box.x, y: box.y, w: firstWidth, h: box.h };
      secondBox = { x: box.x + firstWidth, y: box.y, w: box.w - firstWidth, h: box.h };
    } else {
      const firstHeight = box.h * ratio;
      firstBox = { x: box.x, y: box.y, w: box.w, h: firstHeight };
      // Important: advance along Y, not X. Using x + firstHeight here pushed
      // portrait-mode territories off the board and made players disappear.
      secondBox = { x: box.x, y: box.y + firstHeight, w: box.w, h: box.h - firstHeight };
    }

    return [
      ...split(firstGroup, firstBox, depth + 1),
      ...split(secondGroup, secondBox, depth + 1),
    ];
  };

  return split(weightedPlayers, { x: 0, y: 0, w: 100, h: 100 }, 0);
}

/**
 * Pick a varied, inset point inside a convex territory. Convex combinations
 * of the shrunken polygon vertices stay inside the player's zone, preventing
 * the ball from stopping over a neighbouring player after the draw.
 */
export function samplePointInIceArenaTerritory<T extends IceArenaTerritoryParticipant>(
  territory: IceArenaTerritoryNode<T>,
  random: () => number = Math.random,
): IceArenaPoint {
  const center = { x: territory.cx, y: territory.cy };
  const inset = territory.points.map((point) => ({
    x: center.x + (point.x - center.x) * 0.62,
    y: center.y + (point.y - center.y) * 0.62,
  }));
  const weights = inset.map(() => {
    const value = random();
    return 0.35 + Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const variedPoint = inset.reduce(
    (point, vertex, index) => ({
      x: point.x + vertex.x * (weights[index] / totalWeight),
      y: point.y + vertex.y * (weights[index] / totalWeight),
    }),
    { x: 0, y: 0 },
  );

  // Keep a little extra distance from every border to account for the sphere's radius.
  return {
    x: center.x + (variedPoint.x - center.x) * 0.82,
    y: center.y + (variedPoint.y - center.y) * 0.82,
  };
}
