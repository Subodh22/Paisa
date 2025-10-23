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
  const monthKey: MonthKey = useMemo(() => ({ 
    year: currentMonth.getUTCFullYear(), 
    month: currentMonth.getUTCMonth() 
  }), [currentMonth]);
  const [data, setData] = useState<CalendarData>({ startingBalance: 0, transactions: [], rules: [] });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  useEffect(() => {
    setData(loadMonth(monthKey));
  }, [monthKey]);

  useEffect(() => {
    saveMonth(monthKey, data);
  }, [monthKey, data]);

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

  function handleDateClick(dateStr: string) {
    setSelectedDate(dateStr);
    setShowTransactionModal(true);
  }

  function closeTransactionModal() {
    setShowTransactionModal(false);
    setSelectedDate(null);
  }

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(currentMonth);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
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

      <div className="w-full">
        <div className="grid grid-cols-7 gap-1 text-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-gray-500 py-2 font-medium">{d}</div>
          ))}
        </div>
        <table className="calendar-table" style={{ 
          width: '100%',
          height: '768px',
          tableLayout: 'fixed',
          borderCollapse: 'separate',
          borderSpacing: '4px'
        }}>
          <tbody>
            {Array.from({ length: 6 }).map((_, rowIdx) => (
              <tr key={rowIdx} style={{ height: '128px' }}>
                {Array.from({ length: 7 }).map((_, colIdx) => {
                  const day = rowIdx * 7 + colIdx - firstWeekday + 1;
                  if (day < 1 || day > daysInMonth) {
                    return (
                      <td 
                        key={`${rowIdx}-${colIdx}`} 
                        className="border rounded bg-gray-50 calendar-cell" 
                        style={{ 
                          height: '128px', 
                          minHeight: '128px', 
                          maxHeight: '128px',
                          overflow: 'hidden',
                          verticalAlign: 'top',
                          padding: '0'
                        }} 
                      />
                    );
                  }
                  const dateStr = isoDate(monthKey.year, monthKey.month, day);
                  const delta = snapshots.find(s => s.date === dateStr)?.dailyDelta ?? 0;
                  const running = snapshots.find(s => s.date === dateStr)?.runningBalance ?? data.startingBalance;
                  const ts = data.transactions.filter(t => t.date === dateStr);
                  return (
                    <td 
                      key={`${rowIdx}-${colIdx}`} 
                      className="border rounded bg-white cursor-pointer hover:bg-gray-50 transition-colors calendar-cell"
                      style={{ 
                        height: '128px', 
                        minHeight: '128px', 
                        maxHeight: '128px',
                        overflow: 'hidden',
                        position: 'relative',
                        verticalAlign: 'top',
                        padding: '0'
                      }}
                      onClick={() => handleDateClick(dateStr)}
                    >
                      {/* Header with day number and action buttons - absolutely positioned */}
                      <div 
                        className="flex items-center justify-between p-2 pb-1 absolute top-0 left-0 right-0 z-10"
                        style={{ height: '32px' }}
                      >
                        <span className="font-semibold text-sm">{day}</span>
                        <div className="flex gap-1">
                          <button
                            className="px-1.5 py-0.5 border rounded text-green-700 text-xs hover:bg-green-50"
                            aria-label={`Add income on ${dateStr}`}
                            onClick={(e) => {
                              e.stopPropagation();
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
                            className="px-1.5 py-0.5 border rounded text-red-700 text-xs hover:bg-red-50"
                            aria-label={`Add expense on ${dateStr}`}
                            onClick={(e) => {
                              e.stopPropagation();
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
                      
                      {/* Transaction count display - absolutely positioned center */}
                      <div 
                        className="flex items-center justify-center px-2 absolute"
                        style={{ 
                          top: '32px',
                          left: '0',
                          right: '0',
                          height: '64px'
                        }}
                      >
                        <div className="text-xs text-gray-600 text-center">
                          {ts.length > 0 && (
                            <div className="leading-tight">
                              <div className="font-medium text-sm">{ts.length}</div>
                              <div className="text-xs">trans</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Footer with delta and running balance - absolutely positioned bottom */}
                      <div 
                        className="text-xs flex items-center justify-between border-t pt-1 px-2 pb-2 absolute bottom-0 left-0 right-0"
                        style={{ height: '32px' }}
                      >
                        <span className={`truncate ${delta >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
                        </span>
                        <span className="text-gray-600 truncate ml-1">{running.toFixed(2)}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between text-sm text-gray-600">
        <span>Month key: {monthKeyString(monthKey)}</span>
        <div className="flex gap-2">
          <button className="px-3 py-2 border rounded" onClick={() => addTransaction("income")}>Quick add income</button>
          <button className="px-3 py-2 border rounded" onClick={() => addTransaction("expense")}>Quick add expense</button>
        </div>
      </footer>

      {/* Transaction Modal */}
      {showTransactionModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Transactions for {new Date(selectedDate + "T00:00:00Z").toLocaleDateString()}
              </h3>
              <button 
                onClick={closeTransactionModal}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Existing Transactions */}
              <div>
                <h4 className="font-medium mb-2">Existing Transactions</h4>
                <div className="space-y-2">
                  {data.transactions
                    .filter(t => t.date === selectedDate)
                    .map(t => (
                      <div key={t.id} className="flex items-center gap-2 p-2 border rounded">
                        <input
                          type="number"
                          className="w-24 border rounded px-2 py-1"
                          value={t.amount}
                          onChange={e => updateTransaction(t.id, { amount: parseFloat(e.target.value || "0") })}
                          aria-label="Amount"
                        />
                        <select
                          className="border rounded px-2 py-1"
                          value={t.type}
                          onChange={e => updateTransaction(t.id, { type: e.target.value as Transaction["type"] })}
                          aria-label="Type"
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                        <input
                          type="text"
                          className="flex-1 border rounded px-2 py-1"
                          value={t.note ?? ""}
                          onChange={e => updateTransaction(t.id, { note: e.target.value })}
                          placeholder="Note"
                          aria-label="Note"
                        />
                        <button 
                          className="text-red-600 hover:bg-red-50 px-2 py-1 rounded" 
                          onClick={() => deleteTransaction(t.id)} 
                          aria-label="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  {data.transactions.filter(t => t.date === selectedDate).length === 0 && (
                    <p className="text-gray-500 text-sm">No transactions for this date</p>
                  )}
                </div>
              </div>

              {/* Add New Transaction */}
              <div>
                <h4 className="font-medium mb-2">Add New Transaction</h4>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    onClick={() => {
                      const t: Transaction = {
                        id: `m-${Date.now()}`,
                        date: selectedDate,
                        type: "income",
                        amount: 0,
                        note: "",
                        source: "manual",
                      };
                      setData(prev => ({ ...prev, transactions: [...prev.transactions, t] }));
                    }}
                  >
                    Add Income
                  </button>
                  <button 
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={() => {
                      const t: Transaction = {
                        id: `m-${Date.now()}`,
                        date: selectedDate,
                        type: "expense",
                        amount: 0,
                        note: "",
                        source: "manual",
                      };
                      setData(prev => ({ ...prev, transactions: [...prev.transactions, t] }));
                    }}
                  >
                    Add Expense
                  </button>
                </div>
              </div>

              {/* Daily Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>Daily Total:</span>
                  <span className={snapshots.find(s => s.date === selectedDate)?.dailyDelta ?? 0 >= 0 ? "text-green-700" : "text-red-700"}>
                    {snapshots.find(s => s.date === selectedDate)?.dailyDelta ?? 0 >= 0 ? "+" : ""}
                    {(snapshots.find(s => s.date === selectedDate)?.dailyDelta ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Running Balance:</span>
                  <span className="font-medium">
                    {(snapshots.find(s => s.date === selectedDate)?.runningBalance ?? data.startingBalance).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


