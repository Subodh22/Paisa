import { CalendarData, MonthKey, monthKeyString } from "./types";

const STORAGE_PREFIX = "cashflow";

function storageKeyForMonth(key: MonthKey): string {
  return `${STORAGE_PREFIX}:month:${monthKeyString(key)}`;
}

export function loadMonth(key: MonthKey): CalendarData {
  if (typeof window === "undefined") {
    return { startingBalance: 0, transactions: [], rules: [] };
  }
  try {
    const raw = window.localStorage.getItem(storageKeyForMonth(key));
    if (!raw) return { startingBalance: 0, transactions: [], rules: [] };
    const parsed = JSON.parse(raw) as CalendarData;
    if (!parsed || typeof parsed.startingBalance !== "number") {
      return { startingBalance: 0, transactions: [], rules: [] };
    }
    return parsed;
  } catch {
    return { startingBalance: 0, transactions: [], rules: [] };
  }
}

export function saveMonth(key: MonthKey, data: CalendarData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKeyForMonth(key), JSON.stringify(data));
}

export function exportMonthJson(key: MonthKey): string {
  const data = loadMonth(key);
  return JSON.stringify(data, null, 2);
}

export function importMonthJson(key: MonthKey, json: string): void {
  const parsed = JSON.parse(json) as CalendarData;
  saveMonth(key, parsed);
}

