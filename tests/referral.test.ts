import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReferralStartParam } from '../src/lib/store.server.ts';

// Реферальные ссылки: https://t.me/<bot>?startapp=ref_<userId>
// Легаси-ссылки использовали префикс r_ — он тоже должен атрибутироваться.

test('parses canonical ref_ start param', () => {
  assert.equal(parseReferralStartParam('ref_1337'), 1337);
  assert.equal(parseReferralStartParam('ref_1198270529'), 1198270529);
});

test('parses legacy r_ start param (old shared links)', () => {
  assert.equal(parseReferralStartParam('r_1337'), 1337);
  assert.equal(parseReferralStartParam('r_5698050836'), 5698050836);
});

test('rejects junk start params', () => {
  assert.equal(parseReferralStartParam(null), undefined);
  assert.equal(parseReferralStartParam(undefined), undefined);
  assert.equal(parseReferralStartParam(''), undefined);
  assert.equal(parseReferralStartParam('start'), undefined);
  assert.equal(parseReferralStartParam('ref_'), undefined);
  assert.equal(parseReferralStartParam('ref_abc'), undefined);
  assert.equal(parseReferralStartParam('r_-5'), undefined);
  assert.equal(parseReferralStartParam('ref_12extra'), undefined);
  assert.equal(parseReferralStartParam('reffer_12'), undefined);
});
