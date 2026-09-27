/**
 * Client-side validation for withdrawal flow.
 * Server validation is mandatory, this is for UX.
 */

export type ValidationResult = { valid: boolean; error?: string };

const TON_REGEX = /^(EQ|UQ)[A-Za-z0-9_-]{46}$/; // Simplified TON user-friendly
const TON_RAW_REGEX = /^0:[a-fA-F0-9]{64}$/;
const EVM_REGEX = /^0x[a-fA-F0-9]{40}$/;
const BTC_LEGACY_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const BTC_SEGWIT_REGEX = /^(bc1)[a-z0-9]{25,90}$/i;
const BTC_TAPROOT_REGEX = /^(bc1p)[a-z0-9]{38,90}$/i;
const SOL_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRON_REGEX = /^T[A-Za-z1-9]{33}$/;

export function validateAddressForNetwork(address: string, networkId: string): ValidationResult {
  const trimmed = address.trim();
  if (!trimmed) return { valid: false, error: 'Введите адрес' };

  switch (networkId) {
    case 'TON':
    case 'TONCOIN':
      if (TON_REGEX.test(trimmed) || TON_RAW_REGEX.test(trimmed)) return { valid: true };
      return { valid: false, error: 'Неверный формат TON-адреса' };
    case 'ETH':
    case 'ERC20':
    case 'ARBITRUM':
    case 'BSC':
    case 'POLYGON':
      if (EVM_REGEX.test(trimmed)) return { valid: true };
      return { valid: false, error: 'Неверный формат EVM-адреса (0x...)' };
    case 'BTC':
    case 'BITCOIN':
      if (BTC_LEGACY_REGEX.test(trimmed) || BTC_SEGWIT_REGEX.test(trimmed) || BTC_TAPROOT_REGEX.test(trimmed))
        return { valid: true };
      return { valid: false, error: 'Неверный формат BTC-адреса' };
    case 'SOL':
    case 'SOLANA':
      if (SOL_REGEX.test(trimmed)) return { valid: true };
      return { valid: false, error: 'Неверный формат Solana-адреса' };
    case 'TRON':
    case 'TRC20':
      if (TRON_REGEX.test(trimmed)) return { valid: true };
      return { valid: false, error: 'Неверный формат TRON-адреса' };
    case 'USDT_TON':
      if (TON_REGEX.test(trimmed) || TON_RAW_REGEX.test(trimmed)) return { valid: true };
      return { valid: false, error: 'Неверный формат адреса' };
    default:
      // Generic: allow if length >= 20 and alphanumeric
      if (trimmed.length >= 20 && trimmed.length <= 128) return { valid: true };
      return { valid: false, error: 'Неверный формат адреса' };
  }
}

export function validateAmount(
  amountAtomicStr: string,
  availableAtomicStr: string,
  minAtomicStr?: string,
  feeAtomicStr?: string
): ValidationResult {
  try {
    const amount = BigInt(amountAtomicStr);
    const available = BigInt(availableAtomicStr);
    if (amount <= 0n) return { valid: false, error: 'Сумма должна быть больше 0' };
    if (minAtomicStr) {
      const min = BigInt(minAtomicStr);
      if (amount < min) return { valid: false, error: `Минимальная сумма ${min.toString()}` };
    }
    const fee = feeAtomicStr ? BigInt(feeAtomicStr) : 0n;
    const total = amount + fee;
    if (total > available) return { valid: false, error: 'Недостаточно средств с учётом комиссии' };
    if (amount > available) return { valid: false, error: 'Недостаточно средств' };
    return { valid: true };
  } catch {
    return { valid: false, error: 'Неверный формат суммы' };
  }
}

export function isQuoteExpired(expiresAt: string): boolean {
  try {
    return new Date(expiresAt).getTime() < Date.now();
  } catch {
    return true;
  }
}
