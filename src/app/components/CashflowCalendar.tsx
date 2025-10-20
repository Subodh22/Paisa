"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarData, CashflowSnapshot, MonthKey, Transaction, isoDate, monthKeyString } from "../lib/types";
import { generateOccurrencesForMonth } from "../lib/recurrence";
import { loadMonth, saveMonth } from "../lib/storage";

function getDaysInMonth(year: number, monthZeroBased: number): number {
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

function toMonthDate(year: number, monthZeroBased: number, day: number): Date {
  return new Date(Date.UTC(year, monthZeroBased, day));
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function computeSnapshots(
  data: CalendarData,
  year: number,
  monthZeroBased: number
): CashflowSnapshot[] {
  const occ = generateOccurrencesForMonth(data.rules, year, monthZeroBased);
  const manual = data.transactions.filter(t => {
    const d = new Date(t.date + "T00:00:00Z");
    return d.getUTCFullYear() === year && d.getUTCMonth() === monthZeroBased;
  });
  const all: Transaction[] = [...occ, ...manual].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const days = getDaysInMonth(year, monthZeroBased);
  let running = data.startingBalance;
  const result: CashflowSnapshot[] = [];
  for (let day = 1; day <= days; day++) {
    const dateStr = isoDate(year, monthZeroBased, day);
    const todays = all.filter(t => t.date === dateStr);
    const delta = todays.reduce((acc, t) => acc + (t.type === "income" ? t.amount : -t.amount), 0);
    running += delta;
    result.push({ date: dateStr, dailyDelta: delta, runningBalance: running });
  }
  return result;
}

export default function CashflowCalendar() {
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const monthKey: MonthKey = { year: currentMonth.getUTCFullYear(), month: currentMonth.getUTCMonth() };
  const [data, setData] = useState<CalendarData>({ startingBalance: 0, transactions: [], rules: [] });

  useEffect(() => {
    setData(loadMonth(monthKey));
  }, [monthKey.year, monthKey.month]);

  useEffect(() => {
    saveMonth(monthKey, data);
  }, [monthKey.year, monthKey.month, data]);

  const snapshots = useMemo(
    () => computeSnapshots(data, monthKey.year, monthKey.month),
    [data, monthKey.year, monthKey.month]
  );

  const daysInMonth = getDaysInMonth(monthKey.year, monthKey.month);
  const firstWeekday = toMonthDate(monthKey.year, monthKey.month, 1).getUTCDay();
  const gridCells = firstWeekday + daysInMonth;

  function handleStartingBalanceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value || "0");
    setData(prev => ({ ...prev, startingBalance: isFinite(val) ? val : 0 }));
  }

  function addTransaction(type: "income" | "expense") {
    const todayStr = isoDate(monthKey.year, monthKey.month, Math.min(new Date().getUTCDate(), daysInMonth));
    const t: Transaction = {
      id: `m-${Date.now()}`,
      date: todayStr,
      type,
      amount: 0,
      note: "",
      source: "manual",
    };
    setData(prev => ({ ...prev, transactions: [...prev.transactions, t] }));
  }

  function updateTransaction(id: string, patch: Partial<Transaction>) {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }

  function deleteTransaction(id: string) {
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
  }

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(currentMonth);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 border rounded" aria-label="Previous month" onClick={() => setCurrentMonth(m => addMonths(m, -1))}>
            ←
          </button>
          <button className="px-3 py-2 border rounded" aria-label="Next month" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            →
          </button>
          <button className="px-3 py-2 border rounded" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>Today</button>
          <h2 className="text-xl font-semibold ml-2">{monthLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500" htmlFor="startingBalance">Starting balance</label>
          <input
            id="startingBalance"
            type="number"
            className="border rounded px-2 py-1 w-32"
            value={data.startingBalance}
            onChange={handleStartingBalanceChange}
          />
        </div>
      </header>

      <div className="grid grid-cols-7 gap-2 text-sm">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-center text-gray-500">{d}</div>
        ))}
        {Array.from({ length: gridCells }).map((_, idx) => {
          const day = idx - firstWeekday + 1;
          if (day < 1 || day > daysInMonth) return <div key={idx} className="h-28 border rounded bg-gray-50" />;
          const dateStr = isoDate(monthKey.year, monthKey.month, day);
          const delta = snapshots.find(s => s.date === dateStr)?.dailyDelta ?? 0;
          const running = snapshots.find(s => s.date === dateStr)?.runningBalance ?? data.startingBalance;
          const ts = data.transactions.filter(t => t.date === dateStr);
          return (
            <div key={idx} className="h-28 border rounded p-2 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{day}</span>
                <div className="flex gap-1">
                  <button
                    className="px-2 py-0.5 border rounded text-green-700"
                    aria-label={`Add income on ${dateStr}`}
                    onClick={() => {
                      const t: Transaction = {
                        id: `m-${Date.now()}`,
                        date: dateStr,
                        type: "income",
                        amount: 0,
                        note: "",
                        source: "manual",
                      };
                      setData(prev => ({ ...prev, transactions: [...prev.transactions, t] }));
                    }}
                  >
                    +
                  </button>
                  <button
                    className="px-2 py-0.5 border rounded text-red-700"
                    aria-label={`Add expense on ${dateStr}`}
                    onClick={() => {
                      const t: Transaction = {
                        id: `m-${Date.now()}`,
                        date: dateStr,
                        type: "expense",
                        amount: 0,
                        note: "",
                        source: "manual",
                      };
                      setData(prev => ({ ...prev, transactions: [...prev.transactions, t] }));
                    }}
                  >
                    -
                  </button>
                </div>
              </div>
              <div className="mt-1 flex-1 overflow-auto space-y-1">
                {ts.map(t => (
                  <div key={t.id} className="flex items-center gap-1">
                    <input
                      type="number"
                      className="w-20 border rounded px-1 py-0.5"
                      value={t.amount}
                      onChange={e => updateTransaction(t.id, { amount: parseFloat(e.target.value || "0") })}
                      aria-label="Amount"
                    />
                    <select
                      className="border rounded px-1 py-0.5"
                      value={t.type}
                      onChange={e => updateTransaction(t.id, { type: e.target.value as Transaction["type"] })}
                      aria-label="Type"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    <input
                      type="text"
                      className="flex-1 border rounded px-1 py-0.5"
                      value={t.note ?? ""}
                      onChange={e => updateTransaction(t.id, { note: e.target.value })}
                      placeholder="Note"
                      aria-label="Note"
                    />
                    <button className="text-xs text-red-600" onClick={() => deleteTransaction(t.id)} aria-label="Delete">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-1 text-xs flex items-center justify-between">
                <span className={delta >= 0 ? "text-green-700" : "text-red-700"}>{delta >= 0 ? "+" : ""}{delta.toFixed(2)}</span>
                <span className="text-gray-600">{running.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="flex items-center justify-between text-sm text-gray-600">
        <span>Month key: {monthKeyString(monthKey)}</span>
        <div className="flex gap-2">
          <button className="px-3 py-2 border rounded" onClick={() => addTransaction("income")}>Quick add income</button>
          <button className="px-3 py-2 border rounded" onClick={() => addTransaction("expense")}>Quick add expense</button>
        </div>
      </footer>
    </div>
  );
}


