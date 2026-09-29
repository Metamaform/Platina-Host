import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPlatformCurve,
  buildPlatformLayout,
  ticketToFrac,
  SEGMENT_GAP_PX,
  PLATFORM_CURVE,
} from '../src/components/arena/arenaPlatform';
import type { ArenaParticipant } from '../src/lib/arenaShared';

function mkParticipant(id: string, contribution: number, i: number): ArenaParticipant {
  return {
    id,
    userId: i + 1,
    username: `user${i}`,
    betAmount: contribution,
    contribution,
    percentage: 0,
    status: 'ACTIVE',
    joinedAt: 0,
  };
}

test('curve: endpoints, climb to the top-right, clamping', () => {
  const w = 400, h = 190;
  const geo = buildPlatformCurve(w, h);
  assert.ok(geo.total > 300 && geo.total < 900, 'reasonable arc length');

  const p0 = geo.pointAt(0);
  const p1 = geo.pointAt(0.5);
  const p2 = geo.pointAt(1);
  assert.ok(Math.abs(p0.x - PLATFORM_CURVE[0].x * w) < 0.01, 'start point');
  assert.ok(Math.abs(p0.y - PLATFORM_CURVE[0].y * h) < 0.01, 'start point');
  assert.ok(Math.abs(p2.x - PLATFORM_CURVE[3].x * w) < 0.01, 'end point');
  assert.ok(Math.abs(p2.y - PLATFORM_CURVE[3].y * h) < 0.01, 'end point');
  assert.ok(p2.y < p1.y && p2.x > p1.x, 'curve climbs to the top-right');
  assert.ok(Math.abs(p0.angle) < 1, 'takeoff strip is flat at the start');
  assert.ok(p1.angle < -5, 'tangent points up at mid-curve');

  // clamping: frac вне 0..1 не выходит за концы дуги
  assert.deepEqual(geo.pointAt(-5), p0);
  assert.deepEqual(geo.pointAt(5), p2);
});

test('segments tile the whole deck and stay proportional to contributions', () => {
  const w = 400, h = 190;
  const contributions = [50, 10, 30, 200, 5];
  const parts = contributions.map((c, i) => mkParticipant(`bet-${i}`, c, i));
  const layout = buildPlatformLayout(w, h, parts);
  const sum = contributions.reduce((a, b) => a + b, 0);

  let acc = 0;
  for (let i = 0; i < parts.length; i++) {
    const s = layout.segs[i];
    const from = acc / sum;
    acc += contributions[i];
    const to = acc / sum;
    assert.ok(Math.abs(s.dashStart / layout.geo.total - from) < 1e-9, `seg ${i} start`);
    assert.ok(Math.abs(s.lenPx / layout.geo.total - (to - from)) < 1e-9, `seg ${i} length`);
    // видимая длина = полная минус зазоры по краям
    assert.ok(Math.abs(s.dashLen - ((to - from) * layout.geo.total - 2 * SEGMENT_GAP_PX)) < 1e-6, `seg ${i} gap`);
    assert.ok(s.mid.x >= 0 && s.mid.x <= w && s.mid.y >= 0 && s.mid.y <= h, `seg ${i} mid in bounds`);
  }
  // последняя территория доходит ровно до конца дуги
  const last = layout.segs[layout.segs.length - 1];
  assert.ok(Math.abs(last.dashStart + last.lenPx - layout.geo.total) < 1e-6, 'tiles to the end');

  // самый большой вклад → самая длинная территория
  const lens = layout.segs.map((s) => s.lenPx);
  assert.equal(Math.max(...lens), lens[3]);
});

test('ticket always lands inside the winner segment (same rule as server pickWinner)', () => {
  const w = 400, h = 190;
  const contributions = [10, 25, 40, 25];
  const parts = contributions.map((c, i) => mkParticipant(`bet-${i}`, c, i));
  const layout = buildPlatformLayout(w, h, parts);
  const sum = contributions.reduce((a, b) => a + b, 0);

  const rolls = [0.0001, 0.05, 0.149, 0.251, 0.4, 0.6, 0.751, 0.9, 0.9999];
  for (const roll of rolls) {
    const ticket = sum * roll;

    // серверное правило: первый участник, для которого ticket < acc
    let acc = 0;
    let winnerIdx = parts.length - 1;
    for (let i = 0; i < parts.length; i++) {
      acc += contributions[i];
      if (ticket < acc) { winnerIdx = i; break; }
    }
    let from = 0;
    for (let i = 0; i < winnerIdx; i++) from += contributions[i];
    from /= sum;

    const frac = ticketToFrac(ticket, sum);
    assert.ok(frac >= from, `roll ${roll}: ticket not before winner segment`);
    assert.ok(frac < from + contributions[winnerIdx] / sum || frac <= 1, `roll ${roll}: ticket not after winner segment`);
    assert.ok(frac >= 0 && frac <= 1, `roll ${roll}: frac clamped`);
  }
});

test('edge cases: empty participants, zero pool, single player', () => {
  const empty = buildPlatformLayout(400, 190, []);
  assert.equal(empty.segs.length, 0);
  assert.equal(empty.sumC, 0);
  assert.equal(ticketToFrac(10, 0), 0);

  const solo = buildPlatformLayout(400, 190, [mkParticipant('only', 100, 0)]);
  assert.equal(solo.segs.length, 1);
  assert.ok(Math.abs(solo.segs[0].lenPx - solo.geo.total) < 1e-6, 'single player owns the whole deck');
});
