import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeIceArenaTerritories,
  samplePointInIceArenaTerritory,
} from '../src/lib/iceArenaTerritories';

interface TestParticipant {
  id: string;
  contribution: number;
  percentage: number;
}

function participant(id: string, contribution: number): TestParticipant {
  return { id, contribution, percentage: 0 };
}

function isInsidePolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

test('high-stake rounds keep every small player visible without changing their odds', () => {
  const players = [
    participant('whale', 10_000),
    participant('small-a', 5),
    participant('small-b', 4),
    participant('small-c', 3),
  ];
  const layout = computeIceArenaTerritories(players, { width: 360, height: 270 });

  assert.equal(layout.length, players.length);
  assert.ok(layout.every((node) => node.areaPct >= 5.9), 'all players receive a readable minimum area');
  assert.ok(Math.abs(layout.reduce((sum, node) => sum + node.areaPct, 0) - 100) < 1e-6);
  assert.equal(layout.find((node) => node.participant.id === 'small-a')?.participant.contribution, 5);
  assert.ok(layout.find((node) => node.participant.id === 'small-a')!.areaPct > 5);
});

test('wide and portrait layouts remain fully inside the field and preserve every area', () => {
  const players = [
    participant('one', 71),
    participant('two', 18),
    participant('three', 7),
    participant('four', 4),
  ];

  for (const mapSize of [{ width: 360, height: 270 }, { width: 270, height: 430 }]) {
    const layout = computeIceArenaTerritories(players, mapSize);
    assert.equal(layout.length, players.length);
    assert.ok(Math.abs(layout.reduce((sum, node) => sum + node.areaPct, 0) - 100) < 1e-6);

    for (const node of layout) {
      assert.ok(node.points.every((point) => (
        point.x >= -1e-6 && point.x <= 100 + 1e-6 && point.y >= -1e-6 && point.y <= 100 + 1e-6
      )), `${node.participant.id} stays on the board`);
      assert.ok(node.areaPct > 0, `${node.participant.id} has visible territory`);
    }
  }
});

test('ball destinations stay inside the winning convex territory', () => {
  const players = [
    participant('large', 1_000),
    participant('small', 2),
    participant('middle', 18),
  ];
  const layout = computeIceArenaTerritories(players, { width: 390, height: 270 });
  let seed = 1;
  const random = () => {
    seed = (seed * 48271) % 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (const territory of layout) {
    for (let i = 0; i < 100; i++) {
      const target = samplePointInIceArenaTerritory(territory, random);
      assert.ok(isInsidePolygon(target, territory.points), `${territory.participant.id} ball target is inside its territory`);
    }
  }
});
