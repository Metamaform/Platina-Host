export type FiatCurrency = 'USD' | 'EUR';

export type WalletSummary = {
  totalFiat: { amount: string; currency: FiatCurrency };
  assets: Array<{ symbol: string; availableAtomic: string; decimals: number; name?: string }>;
};

export type NetworkInfo = {
  id: string;
  name: string;
  displayName: string;
  explorerUrl?: string;
  minWithdrawAtomic: string;
  decimals: number;
};

export type WithdrawDraft = {
  asset: string;
  network: string;
  destination: string;
  amountAtomic: string;
};

export type WithdrawalQuote = {
  feeAtomic: string;
  totalAtomic: string;
  expiresAt: string;
  minAmountAtomic?: string;
  maxAmountAtomic?: string;
};

export type WithdrawalStatus = 'pending' | 'success' | 'failed' | 'requires_review';

export type Withdrawal = {
  id: string;
  draft: WithdrawDraft;
  quote: WithdrawalQuote;
  status: WithdrawalStatus;
  createdAt: string;
  transactionHash?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type AssetConfig = {
  symbol: string;
  name: string;
  decimals: number;
  networks: NetworkInfo[];
  icon?: string;
  availableAtomic: string;
};
