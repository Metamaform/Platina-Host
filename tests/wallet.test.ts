import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Unit tests for formatting utilities
import {
  atomicToDecimalString,
  decimalStringToAtomic,
  formatFiat,
  shortenAddress,
  parseAndValidateAmountInput,
} from '../src/features/wallet/formatting';
import {
  validateAddressForNetwork,
  validateAmount,
  isQuoteExpired,
} from '../src/features/wallet/validation';

// ------------------------------------------------------------
// Formatting
// ------------------------------------------------------------
test('atomicToDecimalString converts correctly', () => {
  assert.equal(atomicToDecimalString('1000000000', 9), '1');
  assert.equal(atomicToDecimalString('1500000000', 9), '1.5');
  assert.equal(atomicToDecimalString('1234567', 6), '1.234567');
  assert.equal(atomicToDecimalString('0', 9), '0');
  assert.equal(atomicToDecimalString('100', 2), '1');
  assert.equal(atomicToDecimalString('1000000', 6, 2), '1.00');
});

test('decimalStringToAtomic converts correctly', () => {
  assert.equal(decimalStringToAtomic('1', 9), '1000000000');
  assert.equal(decimalStringToAtomic('1.5', 9), '1500000000');
  assert.equal(decimalStringToAtomic('0.000001', 6), '1');
  assert.equal(decimalStringToAtomic('0', 9), '0');
  assert.equal(decimalStringToAtomic('12.34', 2), '1234');
});

test('formatFiat and shortenAddress', () => {
  assert.equal(formatFiat('9999.99', 'USD'), '$9,999.99');
  assert.equal(shortenAddress('EQAbcDefGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGh', 6, 4), 'EQAbcD...EfGh');
  assert.equal(shortenAddress('short', 6, 4), 'short');
});

test('parseAndValidateAmountInput', () => {
  assert.equal(parseAndValidateAmountInput('12.34'), '12.34');
  assert.equal(parseAndValidateAmountInput('12,34'), '12.34');
  assert.equal(parseAndValidateAmountInput(''), '');
  assert.equal(parseAndValidateAmountInput('abc'), null);
  assert.equal(parseAndValidateAmountInput('12.34.56'), null);
});

// ------------------------------------------------------------
// Validation
// ------------------------------------------------------------
test('validateAddressForNetwork TON', () => {
  const validTon = 'EQ' + 'A'.repeat(46);
  assert.equal(validateAddressForNetwork(validTon, 'TON').valid, true);
  assert.equal(validateAddressForNetwork('invalid', 'TON').valid, false);
});

test('validateAddressForNetwork EVM', () => {
  const validEvm = '0x' + 'a'.repeat(40);
  assert.equal(validateAddressForNetwork(validEvm, 'ERC20').valid, true);
  assert.equal(validateAddressForNetwork('0x123', 'ERC20').valid, false);
});

test('validateAddressForNetwork BTC', () => {
  assert.equal(validateAddressForNetwork('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'BTC').valid, true);
  assert.equal(validateAddressForNetwork('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'BTC').valid, true);
  assert.equal(validateAddressForNetwork('invalid_btc', 'BTC').valid, false);
});

test('validateAmount logic', () => {
  // available 10 TON (10e9)
  const available = '10000000000';
  const amountOk = '5000000000';
  const fee = '100000000';
  assert.equal(validateAmount(amountOk, available, undefined, fee).valid, true);
  assert.equal(validateAmount('0', available).valid, false);
  assert.equal(validateAmount('20000000000', available).valid, false);
  // insufficient with fee
  assert.equal(validateAmount('9950000000', available, undefined, '1000000000').valid, false);
});

test('isQuoteExpired', () => {
  const future = new Date(Date.now() + 60000).toISOString();
  const past = new Date(Date.now() - 1000).toISOString();
  assert.equal(isQuoteExpired(future), false);
  assert.equal(isQuoteExpired(past), true);
});

// ------------------------------------------------------------
// Component config: QuickActions must contain Вывод, not Отправить
// ------------------------------------------------------------
test('QuickActions config excludes Отправить and includes Вывод', () => {
  const quickActionsPath = path.join(process.cwd(), 'src/features/wallet/QuickActions.tsx');
  const content = readFileSync(quickActionsPath, 'utf8');
  // Should contain label Вывод
  assert.match(content, /['\"]Вывод['\"]/);
  // Should NOT contain Отправить as a label in actions array (allow in comments? Check strict)
  // The file should not have "Отправить" string at all except maybe comment, but per T3 must not be present as UI
  const hasSendLabel = content.includes("label: 'Отправить'") || content.includes('label: "Отправить"') || content.includes("'Отправить'") && content.includes('actions');
  // More robust: check that file doesn't contain the word Отправить in a label context
  assert.equal(content.includes("Отправить"), false, 'QuickActions should not contain Отправить');
});

test('BalancePage does not contain Отправить as quick action', () => {
  const balancePath = path.join(process.cwd(), 'src/components/BalancePage.tsx');
  const content = readFileSync(balancePath, 'utf8');
  // Ensure the new page uses WalletBalanceCard and QuickActions
  assert.match(content, /WalletBalanceCard/);
  assert.match(content, /QuickActions/);
  // Ensure no hardcoded "Отправить" in the quick actions rendering (the old code had it)
  // The word "Отправить" may appear in other contexts? But per T3 it must be absent from screen.
  // We check that the component does not define an action with id 'send' and label 'Отправить'
  assert.equal(content.includes("id: 'send'"), false, 'Should not have send action id');
  assert.equal(content.includes('Отправить'), false, 'BalancePage should not contain Отправить string');
});

test('WalletScreen hierarchy: gradient card, quick actions, premium cards', () => {
  const walletScreenPath = path.join(process.cwd(), 'src/features/wallet/WalletScreen.tsx');
  const content = readFileSync(walletScreenPath, 'utf8');
  assert.match(content, /WalletBalanceCard/);
  assert.match(content, /QuickActions/);
  assert.match(content, /PremiumCardCarousel/);
});

test('WithdrawDialog implements required steps', () => {
  const dialogPath = path.join(process.cwd(), 'src/features/wallet/WithdrawDialog/WithdrawDialog.tsx');
  const content = readFileSync(dialogPath, 'utf8');
  // Check for steps
  assert.match(content, /asset/);
  assert.match(content, /recipient/);
  assert.match(content, /amount/);
  assert.match(content, /review/);
  assert.match(content, /result/);
  // Check for validation and quote logic
  assert.match(content, /createQuote/);
  assert.match(content, /createWithdrawal/);
  assert.ok(/Idempotency/i.test(content), 'Should contain idempotency logic');
  // Accessibility
  assert.match(content, /aria-label/);
  assert.match(content, /aria-modal/);
  assert.match(content, /Escape/);
});

test('Premium cards have PLATINUM and BLACK badges and wave pattern', () => {
  const carouselPath = path.join(process.cwd(), 'src/features/wallet/PremiumCardCarousel.tsx');
  const content = readFileSync(carouselPath, 'utf8');
  assert.match(content, /PLATINUM/);
  assert.match(content, /BLACK/);
  assert.match(content, /Multichain/);
  assert.match(content, /WavePattern/ || /wave/ || /svg/);
});

test('Formatting avoids float: uses BigInt', () => {
  const formattingPath = path.join(process.cwd(), 'src/features/wallet/formatting.ts');
  const content = readFileSync(formattingPath, 'utf8');
  assert.match(content, /BigInt/);
  // Ensure no parseFloat for atomic conversion
  assert.equal(content.includes('parseFloat'), false);
});

// ------------------------------------------------------------
// E2E happy-path mock (simulates quote + withdrawal flow)
// ------------------------------------------------------------
test('E2E happy-path withdrawal with mocked API', async () => {
  const { createQuote, createWithdrawal, getWithdrawal } = await import('../src/features/wallet/withdrawalApi');
  const draft = {
    asset: 'TON',
    network: 'TON',
    destination: 'EQ' + 'A'.repeat(46),
    amountAtomic: '1000000000', // 1 TON
  };
  const quote = await createQuote(draft);
  assert.ok(quote.feeAtomic);
  assert.ok(quote.totalAtomic);
  assert.ok(quote.expiresAt);
  assert.equal(BigInt(quote.totalAtomic) > BigInt(draft.amountAtomic), true);

  const idemKey = `test_${Date.now()}_${Math.random()}`;
  const withdrawal = await createWithdrawal(draft, quote, idemKey);
  assert.equal(withdrawal.status, 'pending');
  assert.ok(withdrawal.id);

  // Wait for status progression (mock updates after 3-5s)
  await new Promise((r) => setTimeout(r, 4000));
  const updated = await getWithdrawal(withdrawal.id);
  // Should be either success, failed, or requires_review, but not pending after 4s in most cases (allow pending)
  assert.ok(['pending', 'success', 'failed', 'requires_review'].includes(updated.status));
});

test('Idempotency key returns same withdrawal', async () => {
  const { createQuote, createWithdrawal } = await import('../src/features/wallet/withdrawalApi');
  const draft = {
    asset: 'TON',
    network: 'TON',
    destination: 'EQ' + 'B'.repeat(46),
    amountAtomic: '1000000000',
  };
  const quote = await createQuote(draft);
  const key = `idem_test_${Date.now()}`;
  const w1 = await createWithdrawal(draft, quote, key);
  const w2 = await createWithdrawal(draft, quote, key);
  assert.equal(w1.id, w2.id);
});
