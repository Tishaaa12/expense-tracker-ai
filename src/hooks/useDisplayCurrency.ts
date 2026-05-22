import { convertCurrency } from '@/lib/currency';

export function useDisplayCurrency(userCurrency?: string) {
  const displayCurrency = userCurrency || 'INR';
  const toDisplay = (amount: number, fromCurrency: string) =>
    convertCurrency(amount, fromCurrency || 'INR', displayCurrency);
  return { displayCurrency, toDisplay };
}
