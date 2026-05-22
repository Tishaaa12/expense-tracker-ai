'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { CURRENCY_SYMBOLS, formatAmount } from '@/lib/currency';
import { AlertTriangle, Settings, Plus, Loader2 } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { MONTH_SHORT_NAMES, formatMonthKey } from '@/lib/dates';
import type { Expense } from '@/types';
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

import { CATEGORIES, CHART_THEME, getCategoryChartColor, STATUS_CLASSES, UI_CLASSES } from '@/lib/design';

export default function Dashboard() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { displayCurrency, toDisplay } = useDisplayCurrency(user?.currency);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [updatingBudget, setUpdatingBudget] = useState(false);
  const [budgetSuccess, setBudgetSuccess] = useState('');

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user]);

  if (authLoading || (!user && loading)) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (!user) return null;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth();

  const thisMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonthNum;
  });

  const totalSpentThisMonth = thisMonthExpenses.reduce(
    (sum, e) => sum + toDisplay(e.amount, e.currency), 0
  );

  const categoryBreakdown = CATEGORIES.map((cat) => {
    const total = thisMonthExpenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + toDisplay(e.amount, e.currency), 0);
    return { name: cat, value: total };
  }).filter((c) => c.value > 0);

  const totalCategoryAmount = categoryBreakdown.reduce((s, c) => s + c.value, 0);
  const largestCategory = categoryBreakdown.sort((a, b) => b.value - a.value)[0];

  const trendData = Array.from({ length: 6 })
    .map((_, i) => {
      const d = new Date();
      d.setMonth(today.getMonth() - i);
      const mNum = d.getMonth();
      const yNum = d.getFullYear();
      const mStr = formatMonthKey(yNum, mNum);
      const total = expenses
        .filter((e) => e.date.startsWith(mStr))
        .reduce((sum, e) => sum + toDisplay(e.amount, e.currency), 0);
      return {
        month: `${MONTH_SHORT_NAMES[mNum]} ${yNum.toString().slice(-2)}`,
        amount: Math.round(total * 100) / 100,
        sortKey: yNum * 12 + mNum,
        isCurrent: mNum === currentMonthNum && yNum === currentYear,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);

  const budgetAlerts: { category: string; limit: number; spent: number; percent: number }[] = [];
  const userBudgets = user.budgets || {};
  CATEGORIES.forEach((cat) => {
    const rawLimit = userBudgets[cat] || 0;
    if (rawLimit > 0) {
      const spent = thisMonthExpenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + toDisplay(e.amount, e.currency), 0);
      budgetAlerts.push({ category: cat, limit: rawLimit, spent, percent: (spent / rawLimit) * 100 });
    }
  });

  const alertCount = budgetAlerts.filter((b) => b.percent >= 80).length;
  const overLimitCount = budgetAlerts.filter((b) => b.percent >= 100).length;

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
    } finally {
      setUpdatingBudget(false);
    }
  };

  return (
    <div className={UI_CLASSES.pageWrapper}>
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-white">Financial Overview</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Real-time tracking of your spending across all active categories — values shown in {displayCurrency}.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-sm">
            <span className="px-3 py-1 text-zinc-500">
              {MONTH_SHORT_NAMES[(currentMonthNum - 1 + 12) % 12]}
            </span>
            <span className="px-3 py-1 bg-zinc-800 text-white rounded-md font-medium">
              {MONTH_SHORT_NAMES[currentMonthNum]} {currentYear}
            </span>
            <span className="px-3 py-1 text-zinc-500">
              {MONTH_SHORT_NAMES[(currentMonthNum + 1) % 12]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={UI_CLASSES.dashboardCard}>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Spent This Month</p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-bold text-white">{formatAmount(totalSpentThisMonth, displayCurrency)}</h2>
            </div>
            <p className="text-zinc-500 text-sm mt-2">Across {thisMonthExpenses.length} transactions</p>
          </div>

          <div className={UI_CLASSES.dashboardCard}>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Budget Alerts</p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-bold text-white">{String(alertCount).padStart(2, '0')}</h2>
              {overLimitCount > 0 && (
                <span className="text-red-400 text-sm font-medium">{overLimitCount} over limit</span>
              )}
              {alertCount > 0 && overLimitCount === 0 && (
                <span className="text-amber-400 text-sm font-medium">{alertCount} near limit</span>
              )}
            </div>
            <p className="text-zinc-500 text-sm mt-2">Categories at or above 80% of limit</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className={`lg:col-span-2 ${UI_CLASSES.dashboardCard}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">Spending Trend</h3>
              <span className="text-xs text-zinc-500">Last 6 Months ({displayCurrency})</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: CHART_THEME.axisTick, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: CHART_THEME.axisTickDim, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${Math.round(Number(v) / 1000)}k`}
                  />
                  <Tooltip
                    cursor={{ fill: CHART_THEME.cursorFill }}
                    contentStyle={{ background: CHART_THEME.tooltipBg, border: `1px solid ${CHART_THEME.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: CHART_THEME.tooltipLabel }}
                    formatter={(val: any) => [formatAmount(Number(val || 0), displayCurrency), 'Spent']}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {trendData.map((entry, i) => (
                      <Cell key={i} fill={entry.isCurrent ? CHART_THEME.barCurrent : CHART_THEME.barInactive} />
                    ))}
                  </Bar>
                </BarChart> 
              </ResponsiveContainer>
            </div>
          </div>

          <div className={UI_CLASSES.dashboardCard}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">Category Breakdown</h3>
              <span className="text-xs text-zinc-500">This month</span>
            </div>

            {categoryBreakdown.length > 0 ? (
              <>
                <div className="relative h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryChartColor(entry.name)} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {largestCategory && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-zinc-500 text-xs">Largest</span>
                      <span className="text-white text-sm font-bold">{largestCategory.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-2">
                  {categoryBreakdown.map((entry) => {
                    const pct = totalCategoryAmount > 0
                      ? Math.round((entry.value / totalCategoryAmount) * 100)
                      : 0;
                    return (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getCategoryChartColor(entry.name) }} />
                          <span className="text-zinc-300">{entry.name}</span>
                        </div>
                        <span className="text-zinc-400 font-medium">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-44 flex items-center justify-center text-zinc-600 text-sm">
                No data for this month.
              </div>
            )}
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className={`lg:col-span-2 ${UI_CLASSES.dashboardCard} space-y-5`}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-100">Active Budget Tracker</h3>
              <span className="text-xs text-zinc-500">Values in {displayCurrency}</span>
            </div>

            {budgetAlerts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-sm">
                No budget limits set. Configure them in Budget Settings.
              </div>
            ) : (
              <div className="space-y-5">
                {budgetAlerts.map((b) => {
                  const isExceeded = b.percent >= 100;
                  const isWarning = b.percent >= 80 && b.percent < 100;
                  const barColor = isExceeded
                    ? STATUS_CLASSES.barExceeded
                    : isWarning
                      ? STATUS_CLASSES.barWarning
                      : STATUS_CLASSES.barOk;

                  return (
                    <div key={b.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-zinc-300">{b.category}</span>
                        <span className="text-zinc-500">
                          <strong className={isExceeded ? STATUS_CLASSES.textExceeded : isWarning ? STATUS_CLASSES.textWarning : 'text-zinc-200'}>
                            {formatAmount(b.spent, displayCurrency)}
                          </strong>
                          {' / '}{formatAmount(b.limit, displayCurrency)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(b.percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-600">{b.percent.toFixed(0)}% consumed</span>
                        {isExceeded && (
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Exceeded limit
                          </span>
                        )}
                        {isWarning && (
                          <span className="text-amber-400">Warning: 80%+ reached</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`${UI_CLASSES.dashboardCard} flex flex-col gap-5`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Settings className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Budget Settings</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Set monthly spending thresholds per category.
              </p>

              {budgetSuccess && (
                <div className={`mb-3 ${UI_CLASSES.alertSuccess}`}>
                  {budgetSuccess}
                </div>
              )}

              <form onSubmit={handleBudgetSubmit} className="space-y-3">
                <select
                  className={UI_CLASSES.select + " w-full"}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 text-sm font-semibold">
                    {CURRENCY_SYMBOLS[displayCurrency] || displayCurrency}
                  </span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5000"
                    className={UI_CLASSES.input + " flex-1"}
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingBudget}
                  className={`${UI_CLASSES.actionButton} w-full py-2`}
                >
                  {updatingBudget ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Save Budget Limit
                </button>
              </form>
            </div>

            <p className="text-xs text-zinc-700 mt-auto">
              Budgets reset at the start of each calendar month.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}