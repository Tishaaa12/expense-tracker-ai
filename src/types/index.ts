export interface Expense {
  _id: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  note: string;
}

export interface AIExtractedExpense {
  amount: number;
  detectedCurrency: string;
  category: string;
  date: string;
  note: string;
  selected: boolean;
}
