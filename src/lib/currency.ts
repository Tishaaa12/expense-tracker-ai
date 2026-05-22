export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

// Approximate exchange rates relative to USD
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156.0,
};

export const SUPPORTED_CURRENCIES = Object.keys(EXCHANGE_RATES);

/**
 * Converts an amount from one currency to another using approximate rates.
 */
export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const fromRate = EXCHANGE_RATES[from] ?? EXCHANGE_RATES['USD'];
  const toRate = EXCHANGE_RATES[to] ?? EXCHANGE_RATES['USD'];
  // Convert to USD first, then to target
  return (amount / fromRate) * toRate;
}

export function formatAmount(amount: number, currencyCode: string = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode + ' ';
  return `${symbol}${amount.toFixed(2)}`;
}
