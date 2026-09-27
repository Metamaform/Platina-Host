/**
 * Formatting utilities - avoids float for balance storage.
 * Atomic amounts are stored as string/bigint.
 */

export function atomicToDecimalString(atomic: string, decimals: number, displayDecimals?: number): string {
  try {
    const big = BigInt(atomic);
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = big / divisor;
    const fractionalPart = big % divisor;
    const fracStr = fractionalPart.toString().padStart(decimals, '0');
    // Trim or limit display decimals
    let displayFrac = fracStr;
    if (displayDecimals !== undefined) {
      if (displayDecimals === 0) {
        displayFrac = '';
      } else {
        displayFrac = fracStr.slice(0, displayDecimals).padEnd(displayDecimals, '0');
        // Trim trailing zeros if not needed? Keep for fiat but trim for crypto?
      }
    }
    if (displayFrac.length === 0) return integerPart.toString();
    // Trim trailing zeros for crypto display but keep at least 2 for fiat? We'll trim trailing zeros but keep min 2 if displayDecimals provided
    if (displayDecimals === undefined) {
      const trimmed = displayFrac.replace(/0+$/, '');
      if (trimmed === '') return integerPart.toString();
      return `${integerPart.toString()}.${trimmed}`;
    } else {
      // If displayDecimals defined, keep exactly that unless trimming allowed
      const trimmed = displayFrac.replace(/0+$/, '');
      if (trimmed === '' && displayDecimals > 0) {
        // keep zeros if fiat style? Let's keep minimal 2 for fiat?
        return `${integerPart.toString()}.${'0'.repeat(Math.min(2, displayDecimals))}`;
      }
      if (trimmed === '') return integerPart.toString();
      return `${integerPart.toString()}.${displayFrac}`;
    }
  } catch {
    return '0';
  }
}

export function decimalStringToAtomic(decimal: string, decimals: number): string {
  if (!decimal) return '0';
  const sanitized = decimal.replace(/,/g, '.').trim();
  if (!/^\d*\.?\d*$/.test(sanitized)) throw new Error('Invalid decimal format');
  const [intPart = '0', fracPart = ''] = sanitized.split('.');
  const paddedFrac = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  const atomic = BigInt(intPart || '0') * (BigInt(10) ** BigInt(decimals)) + BigInt(paddedFrac || '0');
  return atomic.toString();
}

export function formatFiat(amount: string, currency: 'USD' | 'EUR' = 'USD'): string {
  const num = Number(amount);
  if (Number.isNaN(num)) return `$0.00`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCryptoAmount(atomic: string, decimals: number, symbol: string, maxDisplayDecimals = 6): string {
  const decStr = atomicToDecimalString(atomic, decimals);
  // Limit to maxDisplayDecimals for display
  const [intP, fracP = ''] = decStr.split('.');
  if (fracP.length > maxDisplayDecimals) {
    const trimmed = fracP.slice(0, maxDisplayDecimals).replace(/0+$/, '');
    if (trimmed === '') return `${intP} ${symbol}`;
    return `${intP}.${trimmed} ${symbol}`;
  }
  return `${decStr} ${symbol}`;
}

export function shortenAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function parseAndValidateAmountInput(value: string): string | null {
  const sanitized = value.replace(/,/g, '.').trim();
  if (sanitized === '' || sanitized === '.') return '';
  if (!/^\d*\.?\d*$/.test(sanitized)) return null;
  return sanitized;
}
