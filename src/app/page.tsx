"use client";

import { useState, useEffect, useRef } from "react";

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
  source?: 'manual' | 'recurring' | 'import' | 'bank';
  _ruleId?: string;
}

interface RecurringRule {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string;
  frequency: 'weekly' | 'fortnightly' | 'monthly';
  weekday?: number; // 0-6
  dayOfMonth?: number; // 1-31
  start: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
}

interface AppState {
  currentYear: number;
  currentMonth: number; // 0-11
  transactions: Transaction[];
  startingBalanceByMonth: Record<string, number>; // key: 'YYYY-MM' -> number
  recurringRules: RecurringRule[];
}

export default function Home() {
  const [state, setState] = useState<AppState>({
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    transactions: [],
    startingBalanceByMonth: {},
    recurringRules: []
  });
  
  const [activeTab, setActiveTab] = useState("calendar");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [recurringForm, setRecurringForm] = useState<Partial<RecurringRule>>({});
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Storage helpers
  const STORAGE_KEY = 'cashflow_calendar_v1';
  
  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setState(prev => ({
        ...prev,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        startingBalanceByMonth: parsed.startingBalanceByMonth || {},
        recurringRules: Array.isArray(parsed.recurringRules) ? parsed.recurringRules : []
      }));
    } catch {}
  };

  const saveToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      transactions: state.transactions,
      startingBalanceByMonth: state.startingBalanceByMonth,
      recurringRules: state.recurringRules,
    }));
  };

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    saveToStorage();
  }, [state]);

  // Utilities
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  const ymKey = (year: number, month: number) => `${year}-${pad(month+1)}`;
  const formatMoney = (n: number) => {
    if (!isClient) {
      // During SSR, return a simple format to avoid hydration mismatches
      return `$${(n ?? 0).toFixed(2)}`;
    }
    // Use a consistent format on the client
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n ?? 0);
  };

  const startOfMonth = (year: number, month: number) => new Date(year, month, 1);
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const clampDay = (year: number, month: number, day: number) => {
    const dim = daysInMonth(year, month);
    return Math.min(Math.max(1, day), dim);
  };
  const within = (date: string, start: string, end?: string) => {
    const d = new Date(date);
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && d < s) return false;
    if (e && d > e) return false;
    return true;
  };

  // Generate recurring occurrences for current month
  const generateRecurringOccurrences = (year: number, month: number): Transaction[] => {
    const occurrences: Transaction[] = [];
    
    for (const r of state.recurringRules) {
      const start = r.start;
      const end = r.end || undefined;
      
      if (r.frequency === 'monthly') {
        const day = clampDay(year, month, Number(r.dayOfMonth || 1));
        const date = new Date(year, month, day);
        const dstr = ymd(date);
        if (within(dstr, start, end)) {
          occurrences.push({
            id: `${r.id}:${dstr}`,
            type: r.type,
            amount: Number(r.amount),
            note: r.note,
            date: dstr,
            source: 'recurring',
            _ruleId: r.id
          });
        }
      } else if (r.frequency === 'weekly') {
        const weekday = Number(r.weekday ?? 0);
        const firstOfMonth = new Date(year, month, 1);
        const offset = (7 + weekday - firstOfMonth.getDay()) % 7;
        let d = new Date(year, month, 1 + offset);
        while (d.getMonth() === month) {
          const dstr = ymd(d);
          if (within(dstr, start, end)) {
            occurrences.push({
              id: `${r.id}:${dstr}`,
              type: r.type,
              amount: Number(r.amount),
              note: r.note,
              date: dstr,
              source: 'recurring',
              _ruleId: r.id
            });
          }
          d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
        }
      } else if (r.frequency === 'fortnightly') {
        let d = new Date(r.start);
        const monthStart = new Date(year, month, 1);
        while (d < monthStart) {
          d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 14);
        }
        while (d.getMonth() === month && d.getFullYear() === year) {
          const dstr = ymd(d);
          if (within(dstr, start, end)) {
            occurrences.push({
              id: `${r.id}:${dstr}`,
              type: r.type,
              amount: Number(r.amount),
              note: r.note,
              date: dstr,
              source: 'recurring',
              _ruleId: r.id
            });
          }
          d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 14);
        }
      }
    }
    return occurrences;
  };

  const getMonthLabel = () => {
    const first = startOfMonth(state.currentYear, state.currentMonth);
    if (!isClient) {
      // During SSR, use a simple format
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return `${monthNames[state.currentMonth]} ${state.currentYear}`;
    }
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(first);
  };

  const navigateMonth = (direction: number) => {
    const d = new Date(state.currentYear, state.currentMonth + direction, 1);
    setState(prev => ({
      ...prev,
      currentYear: d.getFullYear(),
      currentMonth: d.getMonth()
    }));
  };

  const goToToday = () => {
    const now = new Date();
    setState(prev => ({
      ...prev,
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth()
    }));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const openTransactionDialog = (data: Partial<Transaction>) => {
    setEditingTransaction(data as Transaction);
    setDialogOpen(true);
  };

  const getTransactionsForDate = (date: string) => {
    const { currentYear, currentMonth } = state;
    const monthTxns = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth && t.date === date;
    });
    const rec = generateRecurringOccurrences(currentYear, currentMonth);
    const recTxns = rec.filter(t => t.date === date);
    return [...monthTxns, ...recTxns].sort((a, b) => a.type.localeCompare(b.type));
  };

  const closeTransactionDialog = () => {
    setDialogOpen(false);
    setEditingTransaction(null);
  };

  const saveTransaction = (formData: FormData) => {
    const id = formData.get('id') as string || crypto.randomUUID();
    const type = formData.get('type') as 'income' | 'expense';
    const amount = Math.max(0, Number(formData.get('amount') || 0));
    const note = (formData.get('note') as string || '').trim();
    const date = formData.get('date') as string;
    
    if (!date || !amount) return;
    
    const transaction: Transaction = { id, type, amount, note, date };
    
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.find(t => t.id === id)
        ? prev.transactions.map(t => t.id === id ? transaction : t)
        : [...prev.transactions, transaction]
    }));
    
    closeTransactionDialog();
  };

  const deleteTransaction = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
    closeTransactionDialog();
  };

  const saveStartingBalance = () => {
    const key = ymKey(state.currentYear, state.currentMonth);
    const input = document.getElementById('startingBalance') as HTMLInputElement;
    const val = Number(input.value || 0);
    setState(prev => ({
      ...prev,
      startingBalanceByMonth: { ...prev.startingBalanceByMonth, [key]: val }
    }));
  };

  const exportData = () => {
    const data = {
      transactions: state.transactions,
      startingBalanceByMonth: state.startingBalanceByMonth,
      recurringRules: state.recurringRules,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Simple CSV parsing - you can enhance this
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const imported: Transaction[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 3) continue;
        
        const date = values[0]?.trim();
        const amount = parseFloat(values[1]?.trim() || '0');
        const note = values[2]?.trim() || '';
        
        if (date && amount) {
          imported.push({
            id: crypto.randomUUID(),
            type: amount < 0 ? 'expense' : 'income',
            amount: Math.abs(amount),
            note,
            date,
            source: 'import'
          });
        }
      }
      
      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, ...imported]
      }));
    };
    reader.readAsText(file);
  };

  const renderCalendar = () => {
    const { currentYear, currentMonth } = state;
    const first = startOfMonth(currentYear, currentMonth);
    const totalDays = daysInMonth(currentYear, currentMonth);
    const startWeekday = first.getDay();

    const key = ymKey(currentYear, currentMonth);
    const startingBalance = Number(state.startingBalanceByMonth[key] ?? 0);

    // Build transactions map
    const monthTxns = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const rec = generateRecurringOccurrences(currentYear, currentMonth);
    const all = monthTxns.concat(rec);
    const byDate = new Map<string, Transaction[]>();
    
    for (const t of all) {
      if (!byDate.has(t.date)) byDate.set(t.date, []);
      byDate.get(t.date)!.push(t);
    }
    
    for (const arr of byDate.values()) {
      arr.sort((a, b) => a.type.localeCompare(b.type));
    }

    const days = [];
    let runningBalance = startingBalance;
    const monthTotals = { income: 0, expense: 0 };

    // Leading blanks
    for (let i = 0; i < startWeekday; i++) {
      days.push(<div key={`empty-${i}`} className="day-cell blank"></div>);
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(currentYear, currentMonth, day);
      const dateStr = ymd(dateObj);
      const txns = byDate.get(dateStr) || [];
      let dayDelta = 0;
      
      for (const t of txns) {
        dayDelta += (t.type === 'income' ? 1 : -1) * Number(t.amount);
        monthTotals[t.type] += Number(t.amount);
      }
      
      runningBalance += dayDelta;

      days.push(
        <div key={day} className="day-cell">
          <div className="day-header">
            <div className="day-number">{day}</div>
            <div className="day-actions">
              <button 
                className="day-action income"
                onClick={() => openTransactionDialog({ date: dateStr, type: 'income' })}
                title="Add income"
              >
                +
              </button>
              <button 
                className="day-action expense"
                onClick={() => openTransactionDialog({ date: dateStr, type: 'expense' })}
                title="Add expense"
              >
                -
              </button>
            </div>
          </div>
          
          <div className="day-content">
            {txns.map(t => (
              <div 
                key={t.id} 
                className={`txn ${t.type}`}
              >
                <div 
                  className="txn-content"
                  onClick={() => t.source === 'recurring' ? openRecurringForEdit(t._ruleId!) : openTransactionDialog(t)}
                >
                  <div className="note">{t.note || (t.type === 'income' ? 'Income' : 'Expense')}</div>
                  <div className="amount">
                    {(t.type === 'expense' ? '-' : '+') + formatMoney(Math.abs(Number(t.amount)))}
                  </div>
                </div>
                {t.source !== 'recurring' && (
                  <button 
                    className="txn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this transaction?')) {
                        deleteTransaction(t.id);
                      }
                    }}
                    title="Delete transaction"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="day-footer">
            <div className={`daily-delta ${dayDelta >= 0 ? 'positive' : 'negative'}`}>
              {dayDelta === 0 ? '' : `${dayDelta > 0 ? '+' : ''}${formatMoney(dayDelta)}`}
            </div>
            <div className="day-balance">{formatMoney(runningBalance)}</div>
          </div>
        </div>
      );
    }

    // Trailing blanks
    const cellsCount = startWeekday + totalDays;
    const trailing = (7 - (cellsCount % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      days.push(<div key={`trailing-${i}`} className="day-cell blank"></div>);
    }

    return { days, startingBalance, monthTotals };
  };

  const openRecurringForEdit = (ruleId: string) => {
    const rule = state.recurringRules.find(r => r.id === ruleId);
    if (rule) {
      setRecurringForm(rule);
      setShowRecurringForm(true);
      setActiveTab('recurring');
    }
  };

  const saveRecurringRule = (formData: FormData) => {
    const id = formData.get('id') as string || crypto.randomUUID();
    const type = formData.get('type') as 'income' | 'expense';
    const amount = Math.max(0, Number(formData.get('amount') || 0));
    const note = (formData.get('note') as string || '').trim();
    const frequency = formData.get('frequency') as 'weekly' | 'fortnightly' | 'monthly';
    const weekday = Number(formData.get('weekday') || 0);
    const dayOfMonth = Number(formData.get('dayOfMonth') || 0) || undefined;
    const start = formData.get('start') as string;
    const end = formData.get('end') as string || undefined;
    
    if (!amount || !start) return;
    
    const rule: RecurringRule = { id, type, amount, note, frequency, start, end };
    if (frequency === 'weekly') rule.weekday = weekday;
    if (frequency === 'monthly') rule.dayOfMonth = dayOfMonth ?? 1;
    
    setState(prev => ({
      ...prev,
      recurringRules: prev.recurringRules.find(r => r.id === id)
        ? prev.recurringRules.map(r => r.id === id ? rule : r)
        : [...prev.recurringRules, rule]
    }));
    
    setRecurringForm({});
    setShowRecurringForm(false);
  };

  const deleteRecurringRule = (id: string) => {
    setState(prev => ({
      ...prev,
      recurringRules: prev.recurringRules.filter(r => r.id !== id)
    }));
  };

  const { days, startingBalance, monthTotals } = renderCalendar();
  const endBalance = startingBalance + monthTotals.income - monthTotals.expense;

  return (
    <div className="min-h-screen bg-white">
      <header className="app-header">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Cashflow Calendar</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigateMonth(-1)}
                className="px-3 py-2 border rounded"
                aria-label="Previous month"
              >
                ◀
              </button>
              <div className="text-lg font-semibold px-4">{getMonthLabel()}</div>
              <button 
                onClick={() => navigateMonth(1)}
                className="px-3 py-2 border rounded"
                aria-label="Next month"
              >
                ▶
              </button>
              <button 
                onClick={goToToday}
                className="px-3 py-2 border rounded bg-gray-100"
              >
                Today
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="startingBalance" className="text-sm">Starting balance:</label>
              <input
                id="startingBalance"
                type="number"
                step="0.01"
                defaultValue={startingBalance}
                className="border rounded px-2 py-1 w-32"
                placeholder="0.00"
              />
              <button onClick={saveStartingBalance} className="px-3 py-1 border rounded bg-gray-100">Save</button>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded bg-gray-100">Connect (Basiq)</button>
              <button className="px-3 py-1 border rounded bg-gray-100">Fetch (90d)</button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 border rounded bg-gray-100"
              >
                Import CSV
              </button>
              <button onClick={exportData} className="px-3 py-1 border rounded bg-gray-100">Export JSON</button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-full">
          {/* Calendar Section */}
          <div className="lg:col-span-2 min-w-0">
            <div className="calendar max-w-full">
              <div className="weekday-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="days-grid">
                {days}
              </div>
            </div>
          </div>

          {/* Recurring Rules Section */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Add recurring rule</h3>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    saveRecurringRule(formData);
                  }}
                  className="form-grid"
                >
                  <div>
                    <label>Type</label>
                    <select name="type" defaultValue={recurringForm.type || "expense"} required>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div>
                    <label>Amount</label>
                    <input 
                      name="amount" 
                      type="number" 
                      step="0.01" 
                      defaultValue={recurringForm.amount || ""} 
                      required 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="full">
                    <label>Description</label>
                    <input 
                      name="note" 
                      type="text" 
                      maxLength={120} 
                      defaultValue={recurringForm.note || ""} 
                      placeholder="e.g. Rent, Gym" 
                    />
                  </div>
                  <div>
                    <label>Frequency</label>
                    <select name="frequency" defaultValue={recurringForm.frequency || "monthly"} required>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div id="rowWeekday" className={recurringForm.frequency === 'weekly' ? '' : 'hidden'}>
                    <label>Weekday</label>
                    <select name="weekday" defaultValue={recurringForm.weekday || 0}>
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                  <div id="rowDayOfMonth" className={recurringForm.frequency === 'monthly' ? '' : 'hidden'}>
                    <label>Day of month</label>
                    <input 
                      name="dayOfMonth" 
                      type="number" 
                      min="1" 
                      max="31" 
                      defaultValue={recurringForm.dayOfMonth || ""} 
                      placeholder="1-31" 
                    />
                  </div>
                  <div>
                    <label>Start date</label>
                    <input 
                      name="start" 
                      type="date" 
                      defaultValue={recurringForm.start || ""} 
                      required 
                    />
                  </div>
                  <div>
                    <label>End date (optional)</label>
                    <input 
                      name="end" 
                      type="date" 
                      defaultValue={recurringForm.end || ""} 
                    />
                  </div>
                  <div className="dialog-actions">
                    <button type="submit" className="primary">Save Rule</button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setRecurringForm({});
                        setShowRecurringForm(false);
                      }}
                      className="secondary"
                    >
                      Reset
                    </button>
                  </div>
                  <input type="hidden" name="id" value={recurringForm.id || ""} />
                </form>
              </div>
              
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Recurring rules</h3>
                <div className="rec-list">
                  {state.recurringRules.length === 0 ? (
                    <div className="text-gray-500">No recurring rules yet.</div>
                  ) : (
                    state.recurringRules.map(rule => (
                      <div key={rule.id} className="rec-item">
                        <div>
                          <div className="font-medium">
                            {rule.note || (rule.type === 'income' ? 'Income' : 'Expense')} {rule.type === 'expense' ? '-' : '+'}{formatMoney(Math.abs(Number(rule.amount)))}
                          </div>
                          <div className="text-sm text-gray-500">
                            {rule.frequency === 'weekly' ? `Weekly on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][Number(rule.weekday||0)]}` :
                             rule.frequency === 'monthly' ? `Monthly on day ${rule.dayOfMonth}` :
                             'Every 2 weeks'} • from {rule.start}{rule.end ? ` to ${rule.end}` : ''}
                          </div>
                        </div>
                        <div className="actions">
                          <button 
                            onClick={() => openRecurringForEdit(rule.id)}
                            className="secondary"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteRecurringRule(rule.id)}
                            className="danger"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Dialog */}
        {dialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {editingTransaction?.id ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              
              {/* Show existing transactions for this date */}
              {editingTransaction?.date && (
                <div className="mb-6">
                  <h4 className="text-md font-medium mb-3">
                    Transactions for {new Date(editingTransaction.date).toLocaleDateString()}
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {getTransactionsForDate(editingTransaction.date).map(transaction => (
                      <div 
                        key={transaction.id} 
                        className={`flex items-center justify-between p-3 border rounded ${
                          transaction.type === 'income' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {transaction.note || (transaction.type === 'income' ? 'Income' : 'Expense')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaction.type === 'income' ? 'Income' : 'Expense'} • {transaction.source || 'Manual'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            transaction.type === 'income' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {transaction.type === 'expense' ? '-' : '+'}{formatMoney(transaction.amount)}
                          </span>
                          <button
                            onClick={() => openTransactionDialog(transaction)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          {transaction.source !== 'recurring' && (
                            <button
                              onClick={() => {
                                if (confirm('Delete this transaction?')) {
                                  deleteTransaction(transaction.id);
                                }
                              }}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {getTransactionsForDate(editingTransaction.date).length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        No transactions for this date yet
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  saveTransaction(formData);
                }}
                className="form-grid"
              >
                <div>
                  <label>Type</label>
                  <select name="type" defaultValue={editingTransaction?.type || "expense"} required>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label>Amount</label>
                  <input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingTransaction?.amount || ""} 
                    required 
                    placeholder="0.00" 
                  />
                </div>
                <div className="full">
                  <label>Description</label>
                  <input 
                    name="note" 
                    type="text" 
                    maxLength={120} 
                    defaultValue={editingTransaction?.note || ""} 
                    placeholder="e.g. Salary, Rent" 
                  />
                </div>
                <div>
                  <label>Date</label>
                  <input 
                    name="date" 
                    type="date" 
                    defaultValue={editingTransaction?.date || ymd(new Date(state.currentYear, state.currentMonth, 1))} 
                    required 
                  />
                </div>
                <div className="dialog-actions">
                  <button type="submit" className="primary">
                    {editingTransaction?.id ? 'Update' : 'Add'} Transaction
                  </button>
                  {editingTransaction?.id && (
                    <button 
                      type="button" 
                      onClick={() => deleteTransaction(editingTransaction.id)}
                      className="danger"
                    >
                      Delete
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={closeTransactionDialog}
                    className="secondary"
                  >
                    Cancel
                  </button>
                </div>
                <input type="hidden" name="id" value={editingTransaction?.id || ""} />
              </form>
            </div>
          </div>
        )}

        {/* Hidden file input for CSV import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={importCSV}
          style={{ display: 'none' }}
        />
    </main>

      <footer className="app-footer">
        <div className="summary">
          <div className="flex justify-center gap-4">
            <span>Starting: {formatMoney(startingBalance)}</span>
            <span>Income: {formatMoney(monthTotals.income)}</span>
            <span>Expense: {formatMoney(-monthTotals.expense)}</span>
            <span>End: {formatMoney(endBalance)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
