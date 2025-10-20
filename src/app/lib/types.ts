export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  date: string; // ISO yyyy-mm-dd
  type: TransactionType;
  amount: number; // positive currency value
  note?: string;
  source?: "manual" | "recurring" | "import" | "bank";
  ruleId?: string; // if from recurring rule
}

export type RecurrenceFrequency = "weekly" | "fortnightly" | "monthly";

export interface RecurringRule {
  id: string;
  type: TransactionType;
  amount: number;
  note?: string;
  frequency: RecurrenceFrequency;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  weekday?: number; // 0-6 (Sun=0)
  dayOfMonth?: number; // 1-31
  active: boolean;
}

export interface MonthKey {
  year: number;
  month: number; // 0-11
}

export interface CalendarData {
  startingBalance: number;
  transactions: Transaction[];
  rules: RecurringRule[];
}

export interface CashflowSnapshot {
  date: string; // ISO
  dailyDelta: number;
  runningBalance: number;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: number;
}

export function toMonthKey(date: Date): MonthKey {
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function monthKeyString(key: MonthKey): string {
  const m = (key.month + 1).toString().padStart(2, "0");
  return `${key.year}-${m}`;
}

export function isoDate(year: number, monthZeroBased: number, day: number): string {
  const d = new Date(Date.UTC(year, monthZeroBased, day));
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

