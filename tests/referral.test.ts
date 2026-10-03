import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReferralStartParam, sanitizeStoredAvatarUrl } from '../src/lib/store.server.ts';
import { sanitizeAvatarUrl } from '../src/components/UserAvatar.tsx';

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

test('keeps Telegram profile avatar URLs and strips individual generated/stock URLs', () => {
  assert.equal(sanitizeAvatarUrl('/api/telegram/avatar/5698050836?v=abc'), '/api/telegram/avatar/5698050836?v=abc');
  assert.equal(sanitizeAvatarUrl('https://t.me/i/userpic/320/user.jpg'), 'https://t.me/i/userpic/320/user.jpg');
  assert.equal(sanitizeAvatarUrl('https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'), undefined);
  assert.equal(sanitizeAvatarUrl('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'), undefined);
  assert.equal(sanitizeAvatarUrl(''), undefined);
  assert.equal(sanitizeAvatarUrl(null), undefined);

  assert.equal(sanitizeStoredAvatarUrl('/api/telegram/avatar/5698050836?v=abc'), '/api/telegram/avatar/5698050836?v=abc');
  assert.equal(sanitizeStoredAvatarUrl('https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'), undefined);
  assert.equal(sanitizeStoredAvatarUrl('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'), undefined);
});

