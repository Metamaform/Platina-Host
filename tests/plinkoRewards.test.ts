import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preparePlinkoRewards, selectPlinkoReward } from '../src/lib/plinkoRewards';

const gifts = [
  { id: 'cheap', name: 'Cheap', price: 5 },
  { id: 'a', name: 'A', floor_price_gram: 9.5 },
  { id: 'b', name: 'B', floor_price_gram: 10 },
  { id: 'c', name: 'C', floor_price_gram: 10 },
  { id: 'expensive', price: 10.01 },
  { id: 'black', backdrop: 'Black', price: 10 },
  { id: 'onyx', name: 'Gift (Onyx Black)', price: 10 },
  { id: 'gift_black', price: 10 },
  { id: 'bad', price: 'NaN' },
  { id: 'infinite', price: Infinity },
  { id: 'zero', price: 0 },
  { id: 'negative', price: -1 },
];

test('pool contains only finite positive ordinary gifts, sorted by price', () => {
  assert.deepEqual(preparePlinkoRewards(gifts).map(g => g.id), ['cheap', 'a', 'b', 'c', 'expensive']);
});
test('empty pool, invalid budget and unaffordable gifts yield no NFT', () => {
  for (const budget of [0, -1, NaN, Infinity, 4.99]) {
    assert.equal(selectPlinkoReward(preparePlinkoRewards(gifts), budget), null);
  }
  assert.equal(selectPlinkoReward([], 100), null);
});
test('varies equal and nearby prices without exceeding budget or 5% band', () => {
  const pool = preparePlinkoRewards(gifts);
  const ids = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const gift = selectPlinkoReward(pool, 10, undefined, () => i / 100)!;
    ids.add(gift.id);
    assert.ok(gift.priceVal >= 9.5 && gift.priceVal <= 10);
    const remainder = Number((10 - gift.priceVal).toFixed(2));
    assert.equal(gift.priceVal + remainder, 10);
  }
  assert.deepEqual([...ids], ['a', 'b', 'c']);
});
test('avoids previous reward when possible; sole candidate remains available', () => {
  const pool = preparePlinkoRewards(gifts);
  for (let i = 0; i < 100; i++) {
    assert.notEqual(selectPlinkoReward(pool, 10, 'b', () => i / 100)!.id, 'b');
  }
  assert.equal(selectPlinkoReward(pool, 5, 'cheap')!.id, 'cheap');
});
test('repeated rounds keep reward selection bounded and preserve catalog', () => {
  const pool = preparePlinkoRewards(gifts);
  const original = JSON.stringify(pool);
  let previous: string | undefined;
  for (let i = 0; i < 10000; i++) {
    const gift = selectPlinkoReward(pool, 10, previous)!;
    assert.notEqual(gift.id, previous);
    previous = gift.id;
  }
  assert.equal(JSON.stringify(pool), original);
});
