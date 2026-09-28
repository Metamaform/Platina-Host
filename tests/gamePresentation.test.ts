import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CASE_REEL_START, CASE_REEL_WINNER, CASE_REEL_LENGTH, caseReelOffset } from '../src/lib/caseRoulette';
import { buildRocketLadder, getRocketReachedGift, getRocketReachedGiftFromLadder } from '../src/lib/rocketShared';

test('case reel starts centrally with visible cards to either side', () => {
  assert.equal(CASE_REEL_START, Math.floor(CASE_REEL_LENGTH / 2));
  assert.equal(caseReelOffset(CASE_REEL_START) + CASE_REEL_START * 112 + 48, 0);
  assert.ok(CASE_REEL_WINNER > CASE_REEL_START);
  assert.ok(CASE_REEL_LENGTH - CASE_REEL_WINNER >= 4);
});

test('case reel always stops inside the winning card, never in a gap', () => {
  for (const jitter of [-100, -30, 0, 30, 100]) {
    const left = caseReelOffset(CASE_REEL_WINNER, jitter) + CASE_REEL_WINNER * 112;
    assert.ok(left < 0 && left + 96 > 0);
  }
});

test('cached Rocket ladders preserve payouts and next gift across multiplier updates', () => {
  const gifts = [1, 1.5, 2, 3, 49, 50, 51, 53, 56, 100].map(price => ({ id: String(price), price }));
  for (const bet of [0, 1, 3, 50, 100]) {
    const ladder = buildRocketLadder(gifts, bet);
    const snapshot = JSON.stringify(ladder);
    for (const amount of [-1, 0, 0.5, 1, 2.99, 3, 49, 50, 52, 53, 100, 200]) {
      assert.deepEqual(getRocketReachedGiftFromLadder(ladder, amount), getRocketReachedGift(gifts, amount, bet));
    }
    assert.equal(JSON.stringify(ladder), snapshot);
  }
  assert.deepEqual(getRocketReachedGiftFromLadder([], 10), { reachedGift: null, nextGift: null, remainder: 10 });
});
