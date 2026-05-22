'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { CURRENCY_SYMBOLS, formatAmount, convertCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Settings,
  Plus,
  Loader2,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Others'];
const COLORS = ['#818cf8', '#34d399', '#f43f5e', '#fbbf24', '#a78bfa', '#2dd4bf', '#94a3b8'];

interface Expense {
  _id: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  note: string;
}

export default function Dashboard() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Budget settings state
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [updatingBudget, setUpdatingBudget] = useState(false);
  const [budgetSuccess, setBudgetSuccess] = useState('');

  // Currency preference state
  const [selectedCurrency, setSelectedCurrency] = useState(user?.currency || 'USD');
  const [updatingCurrency, setUpdatingCurrency] = useState(false);
  const [currencySuccess, setCurrencySuccess] = useState('');

  useEffect(() => {
    if (user?.currency) setSelectedCurrency(user.currency);
  }, [user]);

  const handleCurrencyChange = async (newCurrency: string) => {
    setSelectedCurrency(newCurrency);
    setUpdatingCurrency(true);
    setCurrencySuccess('');
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: newCurrency }),
      });
      if (res.ok) {
        setCurrencySuccess('Currency preference updated!');
        await refreshUser();
        setTimeout(() => setCurrencySuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingCurrency(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user]);

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-slate-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ── Preferred display currency ─────────────────────────────────
  const displayCurrency = user.currency || 'USD';

  /**
   * Convert any expense amount to the user's preferred display currency.
   * Falls back to the expense's own currency if not supported.
   */
  const toDisplay = (amount: number, fromCurrency: string): number =>
    convertCurrency(amount, fromCurrency || 'USD', displayCurrency);

  // ── Date helpers ───────────────────────────────────────────────
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth();

  const thisMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonthNum;
  });

  // ── Total spent this month (converted) ────────────────────────
  const totalSpentThisMonth = thisMonthExpenses.reduce(
    (sum, e) => sum + toDisplay(e.amount, e.currency),
    0
  );

  // ── Category breakdown (converted) ────────────────────────────
  const categoryBreakdown = CATEGORIES.map((cat) => {
    const total = thisMonthExpenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + toDisplay(e.amount, e.currency), 0);
    return { name: cat, value: total };
  }).filter((c) => c.value > 0);

  // ── 6-Month trend (converted) ─────────────────────────────────
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendData = Array.from({ length: 6 })
    .map((_, i) => {
      const d = new Date();
      d.setMonth(today.getMonth() - i);
      const mNum = d.getMonth();
      const yNum = d.getFullYear();
      const mStr = `${yNum}-${String(mNum + 1).padStart(2, '0')}`;

      const total = expenses
        .filter((e) => e.date.startsWith(mStr))
        .reduce((sum, e) => sum + toDisplay(e.amount, e.currency), 0);

      return {
        month: `${monthNames[mNum]} ${yNum.toString().slice(-2)}`,
        amount: Math.round(total * 100) / 100,
        sortKey: yNum * 12 + mNum,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);

  // ── Budget alerts (converted) ─────────────────────────────────
  const budgetAlerts: { category: string; limit: number; spent: number; percent: number }[] = [];
  const userBudgets = user.budgets || {};

  CATEGORIES.forEach((cat) => {
    const rawLimit = userBudgets[cat] || 0;
    if (rawLimit > 0) {
      // Budget limits are stored in user's preferred currency
      const limit = rawLimit;
      const spent = thisMonthExpenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + toDisplay(e.amount, e.currency), 0);
      const percent = (spent / limit) * 100;
      budgetAlerts.push({ category: cat, limit, spent, percent });
    }
  });

  const exceededBudgetsCount = budgetAlerts.filter((b) => b.percent >= 100).length;
  const warningBudgetsCount = budgetAlerts.filter((b) => b.percent >= 80 && b.percent < 100).length;

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetLimit || isNaN(Number(budgetLimit))) return;
    setUpdatingBudget(true);
    setBudgetSuccess('');
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory, limit: Number(budgetLimit) }),
      });
      if (res.ok) {
        setBudgetSuccess(`Budget for ${selectedCategory} updated!`);
        setBudgetLimit('');
        await refreshUser();
        setTimeout(() => setBudgetSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingBudget(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              Visual insights, budget alerts, and spending summary — all in{' '}
              <span className="text-indigo-400 font-semibold">{displayCurrency}</span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="h-3.5 w-3.5" />
            {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Spent */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">Spent This Month</p>
                <h3 className="text-3xl font-bold text-white mt-2">{formatAmount(totalSpentThisMonth, displayCurrency)}</h3>
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl w-11 h-11 flex items-center justify-center font-bold text-lg">
                {CURRENCY_SYMBOLS[displayCurrency] || displayCurrency}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Across {thisMonthExpenses.length} transactions</p>
          </div>

          {/* Card 2: Exceeded Budgets */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">Exceeded Budgets</p>
                <h3 className="text-3xl font-bold text-white mt-2">{exceededBudgetsCount}</h3>
              </div>
              <div className={`p-3 rounded-xl border ${exceededBudgetsCount > 0 ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Categories completely spent out</p>
          </div>

          {/* Card 3: Near Budget Limit */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">Near Budget Limit</p>
                <h3 className="text-3xl font-bold text-white mt-2">{warningBudgetsCount}</h3>
              </div>
              <div className={`p-3 rounded-xl border ${warningBudgetsCount > 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Categories exceeding 80% limit</p>
          </div>

          {/* Card 4: Monitored Categories */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">Monitored Categories</p>
                <h3 className="text-3xl font-bold text-white mt-2">{budgetAlerts.length}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Categories with configured limits</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 6-Month Trend Bar Chart */}
          <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Spending Trend (Last 6 Months)</h3>
              <span className="text-xs text-slate-500">in {displayCurrency}</span>
            </div>
            <div className="flex-1 w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 600 }}
                    formatter={(val: number) => [formatAmount(val, displayCurrency), 'Spent']}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {trendData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === trendData.length - 1 ? '#818cf8' : '#4f46e5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Pie Chart */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Category Breakdown</h3>
              <span className="text-xs text-slate-500">This month</span>
            </div>
            <div className="flex-1 w-full h-[240px] flex items-center justify-center">
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, index) => {
                        const colorIndex = CATEGORIES.indexOf(entry.name);
                        return <Cell key={`cell-${index}`} fill={COLORS[colorIndex !== -1 ? colorIndex : 0]} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                      itemStyle={{ color: '#ffffff' }}
                      formatter={(val: number) => [formatAmount(val, displayCurrency), '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500 text-sm text-center">No data to show for this month.</div>
              )}
            </div>
            {categoryBreakdown.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                {categoryBreakdown.map((entry) => {
                  const colorIndex = CATEGORIES.indexOf(entry.name);
                  return (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[colorIndex !== -1 ? colorIndex : 0] }} />
                      <span className="text-slate-300 truncate">{entry.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Budget Tracker + Settings Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Budget Progress Bars */}
          <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Active Budget Tracker</h3>
              <span className="text-xs text-slate-500">Values in {displayCurrency}</span>
            </div>

            {budgetAlerts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                No active budget limits configured. Set limits in the Budget Settings panel.
              </div>
            ) : (
              <div className="space-y-5">
                {budgetAlerts.map((b) => {
                  const isExceeded = b.percent >= 100;
                  const isWarning = b.percent >= 80 && b.percent < 100;
                  let barColor = 'bg-indigo-500';
                  if (isExceeded) barColor = 'bg-red-500';
                  else if (isWarning) barColor = 'bg-amber-500';

                  return (
                    <div key={b.category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-300">{b.category}</span>
                        <span className="text-slate-400">
                          <strong className={isExceeded ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-200'}>
                            {formatAmount(b.spent, displayCurrency)}
                          </strong>{' '}
                          / {formatAmount(b.limit, displayCurrency)}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(b.percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">{b.percent.toFixed(0)}% consumed</span>
                        {isExceeded && (
                          <span className="text-red-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Exceeded limit
                          </span>
                        )}
                        {isWarning && (
                          <span className="text-amber-400 font-medium">Warning: Exceeded 80%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Budget & Currency Settings Panel */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col gap-6">

            {/* Budget Limit Setup */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Settings className="h-4 w-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Budget Settings</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Set monthly spending thresholds per category (stored in {displayCurrency}).
              </p>

              {budgetSuccess && (
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {budgetSuccess}
                </div>
              )}

              <form onSubmit={handleBudgetSubmit} className="space-y-3">
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm font-semibold">
                    {CURRENCY_SYMBOLS[displayCurrency] || displayCurrency}
                  </span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5000"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingBudget}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  {updatingBudget ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Save Budget Limit
                </button>
              </form>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800" />

            {/* Preferred Currency */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-indigo-400" />
                <h4 className="text-base font-bold text-white">Display Currency</h4>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                All dashboard totals, charts, and budget bars will be shown in this currency.
              </p>

              {currencySuccess && (
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {currencySuccess}
                </div>
              )}

              <select
                disabled={updatingCurrency}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                value={selectedCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
              >
                <option value="USD">USD ($) — US Dollar</option>
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="JPY">JPY (¥) — Japanese Yen</option>
              </select>
            </div>

            <div className="text-xs text-slate-600 mt-auto">
              Budgets reset at the start of each calendar month.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
