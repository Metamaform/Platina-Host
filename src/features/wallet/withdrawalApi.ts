/**
 * Mock API implementation that respects the contract from T3.
 * Real implementation would call /api/v1/... endpoints.
 * This file provides in-memory simulation with idempotency.
 */

import type { AssetConfig, NetworkInfo, Withdrawal, WithdrawalQuote, WithdrawDraft } from './types';

const MOCK_ASSETS: AssetConfig[] = [
  {
    symbol: 'TON',
    name: 'Toncoin',
    decimals: 9,
    availableAtomic: '12500000000', // 12.5 TON
    networks: [
      { id: 'TON', name: 'TON', displayName: 'TON', explorerUrl: 'https://tonscan.org', minWithdrawAtomic: '100000000', decimals: 9 },
    ],
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    availableAtomic: '250000000', // 250 USDT
    networks: [
      { id: 'TON', name: 'TON', displayName: 'TON', explorerUrl: 'https://tonscan.org', minWithdrawAtomic: '1000000', decimals: 6 },
      { id: 'TRC20', name: 'TRON', displayName: 'TRC-20', explorerUrl: 'https://tronscan.org', minWithdrawAtomic: '1000000', decimals: 6 },
      { id: 'ERC20', name: 'Ethereum', displayName: 'ERC-20', explorerUrl: 'https://etherscan.io', minWithdrawAtomic: '1000000', decimals: 6 },
    ],
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    availableAtomic: '5000000', // 0.05 BTC
    networks: [
      { id: 'BTC', name: 'Bitcoin', displayName: 'Bitcoin', explorerUrl: 'https://mempool.space', minWithdrawAtomic: '10000', decimals: 8 },
    ],
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    availableAtomic: '1500000000000000000', // 1.5 ETH
    networks: [
      { id: 'ERC20', name: 'Ethereum', displayName: 'ERC-20', explorerUrl: 'https://etherscan.io', minWithdrawAtomic: '1000000000000000', decimals: 18 },
      { id: 'ARBITRUM', name: 'Arbitrum', displayName: 'Arbitrum One', explorerUrl: 'https://arbiscan.io', minWithdrawAtomic: '1000000000000000', decimals: 18 },
    ],
  },
  {
    symbol: 'GRAM',
    name: 'Platina Gram',
    decimals: 2,
    availableAtomic: '1000000', // 10000.00 GRAM (if 2 decimals)
    networks: [
      { id: 'TON', name: 'TON', displayName: 'TON', explorerUrl: 'https://tonscan.org', minWithdrawAtomic: '100', decimals: 2 },
    ],
  },
];

const withdrawalsStore: Map<string, Withdrawal> = new Map();
const idempotencyStore: Map<string, string> = new Map(); // key -> withdrawalId

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getWalletSummary() {
  await delay(300);
  return {
    totalFiat: { amount: '9999.99', currency: 'USD' as const },
    assets: MOCK_ASSETS.map((a) => ({
      symbol: a.symbol,
      availableAtomic: a.availableAtomic,
      decimals: a.decimals,
      name: a.name,
    })),
  };
}

export async function getAssetNetworks(asset: string): Promise<NetworkInfo[]> {
  await delay(200);
  const found = MOCK_ASSETS.find((a) => a.symbol === asset);
  if (!found) throw new Error('Asset not found');
  return found.networks;
}

export function getMockAssets(): AssetConfig[] {
  return MOCK_ASSETS;
}

export async function createQuote(draft: WithdrawDraft): Promise<WithdrawalQuote> {
  await delay(500);
  // Simulate fee calculation based on network
  const assetCfg = MOCK_ASSETS.find((a) => a.symbol === draft.asset);
  if (!assetCfg) throw new Error('Asset not found');
  const network = assetCfg.networks.find((n) => n.id === draft.network);
  if (!network) throw new Error('Network not supported for asset');

  // Fee logic mock
  let feeAtomic: string;
  switch (draft.network) {
    case 'TON':
      feeAtomic = assetCfg.decimals === 9 ? '5000000' : assetCfg.decimals === 6 ? '500000' : '100';
      break;
    case 'TRC20':
      feeAtomic = '1000000'; // 1 USDT
      break;
    case 'ERC20':
      feeAtomic = '2000000'; // 2 USDT or 0.001 ETH equivalent
      if (draft.asset === 'ETH') feeAtomic = '1000000000000000'; // 0.001 ETH
      break;
    case 'BTC':
      feeAtomic = '1000'; // 0.00001 BTC
      break;
    default:
      feeAtomic = '1000000';
  }

  // Adjust feeAtomic to asset decimals if mismatch
  // For simplicity assume feeAtomic already matches asset decimals for most, except ETH case handled

  const amount = BigInt(draft.amountAtomic);
  const fee = BigInt(feeAtomic);
  const total = amount + fee;

  // Check available
  const available = BigInt(assetCfg.availableAtomic);
  if (total > available) {
    const err: any = new Error('Insufficient funds');
    err.code = 'INSUFFICIENT_FUNDS';
    err.field = 'amount';
    throw err;
  }

  // Min check
  const min = BigInt(network.minWithdrawAtomic);
  if (amount < min) {
    const err: any = new Error('Amount below minimum');
    err.code = 'BELOW_MINIMUM';
    err.field = 'amount';
    err.minAtomic = network.minWithdrawAtomic;
    throw err;
  }

  // Destination validation mock
  if (!draft.destination || draft.destination.length < 10) {
    const err: any = new Error('Invalid destination');
    err.code = 'INVALID_DESTINATION';
    err.field = 'destination';
    throw err;
  }

  return {
    feeAtomic,
    totalAtomic: total.toString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    minAmountAtomic: network.minWithdrawAtomic,
  };
}

export async function createWithdrawal(draft: WithdrawDraft, quote: WithdrawalQuote, idempotencyKey: string): Promise<Withdrawal> {
  await delay(600);

  // Idempotency check
  if (idempotencyStore.has(idempotencyKey)) {
    const existingId = idempotencyStore.get(idempotencyKey)!;
    const existing = withdrawalsStore.get(existingId);
    if (existing) return existing;
  }

  // Validate quote not expired
  if (new Date(quote.expiresAt).getTime() < Date.now()) {
    const err: any = new Error('Quote expired');
    err.code = 'QUOTE_EXPIRED';
    throw err;
  }

  const id = `wd_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
  const withdrawal: Withdrawal = {
    id,
    draft,
    quote,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  withdrawalsStore.set(id, withdrawal);
  idempotencyStore.set(idempotencyKey, id);

  // Simulate async status progression
  setTimeout(() => {
    const w = withdrawalsStore.get(id);
    if (w && w.status === 'pending') {
      // Randomly succeed or require review 90% success
      const rand = Math.random();
      if (rand < 0.85) {
        w.status = 'success';
        w.transactionHash = `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}`;
      } else if (rand < 0.95) {
        w.status = 'requires_review';
      } else {
        w.status = 'failed';
        w.errorMessage = 'Сеть перегружена, попробуйте позже';
        w.errorCode = 'NETWORK_CONGESTED';
      }
      withdrawalsStore.set(id, w);
    }
  }, 3000 + Math.random() * 2000);

  return withdrawal;
}

export async function getWithdrawal(id: string): Promise<Withdrawal> {
  await delay(200);
  const w = withdrawalsStore.get(id);
  if (!w) throw new Error('Withdrawal not found');
  return w;
}

export async function listWithdrawals(): Promise<Withdrawal[]> {
  await delay(200);
  return Array.from(withdrawalsStore.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
