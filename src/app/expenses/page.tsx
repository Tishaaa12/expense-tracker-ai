'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { CURRENCY_SYMBOLS, SUPPORTED_CURRENCIES, formatAmount, convertCurrency } from '@/lib/currency';
import {
  Plus,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  Tag,
  CheckSquare,
  Square,
  CheckCheck,
  Download,
} from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Others'];

const CATEGORY_COLORS: Record<string, string> = {
  Food: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Transport: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  Utilities: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  Entertainment: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  Health: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Shopping: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Others: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

interface Expense {
  _id: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  note: string;
}

// Represents one extracted row from AI
interface AIExtractedExpense {
  amount: number;
  detectedCurrency: string;
  category: string;
  date: string;
  note: string;
  selected: boolean; // for batch selection
}

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal flags
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form fields
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // AI states
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Batch results from AI
  const [batchExpenses, setBatchExpenses] = useState<AIExtractedExpense[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Sync currency default with user preferred
  useEffect(() => {
    if (user?.currency) setCurrency(user.currency);
  }, [user]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/expenses?page=${page}&limit=10&category=${selectedCategory}&month=${selectedMonth}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setTotalPages(data.pagination.pages || 1);
        setTotalCount(data.pagination.total || 0);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch expenses');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user, page, selectedCategory, selectedMonth]);

  const handleFilterChange = (type: 'category' | 'month', val: string) => {
    if (type === 'category') setSelectedCategory(val);
    if (type === 'month') setSelectedMonth(val);
    setPage(1);
  };

  const openFormModal = (expense: Expense | null = null) => {
    setFormError('');
    if (expense) {
      setEditingExpense(expense);
      setAmount(expense.amount.toString());
      setCurrency(expense.currency || user?.currency || 'USD');
      setCategory(expense.category);
      setDate(expense.date.slice(0, 10));
      setNote(expense.note || '');
    } else {
      setEditingExpense(null);
      setAmount('');
      setCurrency(user?.currency || 'USD');
      setCategory('Food');
      setDate(new Date().toISOString().slice(0, 10));
      setNote('');
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return setFormError('Please enter a valid positive amount.');
    }
    if (!date) return setFormError('Please select a transaction date.');

    setSaving(true);
    try {
      const payload = { amount: Number(amount), currency, category, date, note };
      let res;
      if (editingExpense) {
        res = await fetch(`/api/expenses/${editingExpense._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        setIsFormModalOpen(false);
        fetchExpenses();
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to save expense');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (expenses.length === 1 && page > 1) setPage(page - 1);
        else fetchExpenses();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete expense');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // AI extraction — calls API, shows batch preview modal
  const handleAIExtract = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      });
      const data = await res.json();
      if (res.ok && data.expenses?.length > 0) {
        setBatchExpenses(
          data.expenses.map((e: any) => ({
            amount: e.amount,
            detectedCurrency: e.detectedCurrency || user?.currency || 'USD',
            category: e.category || 'Others',
            date: e.date || new Date().toISOString().slice(0, 10),
            note: e.note || '',
            selected: true,
          }))
        );
        setBatchError('');
        setIsAIModalOpen(false);
        setIsBatchModalOpen(true);
        setAiText('');
      } else if (res.ok && data.expenses?.length === 0) {
        setAiError('No transactions could be extracted from this text. Please try a different input.');
      } else {
        setAiError(data.error || 'AI parsing failed.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Network error');
    } finally {
      setAiLoading(false);
    }
  };

  // Save all selected batch expenses
  const handleBatchSave = async () => {
    const toSave = batchExpenses.filter((e) => e.selected);
    if (toSave.length === 0) return;
    setBatchSaving(true);
    setBatchError('');
    try {
      const results = await Promise.all(
        toSave.map((e) =>
          fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: e.amount,
              currency: e.detectedCurrency,
              category: e.category,
              date: e.date,
              note: e.note,
            }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        setBatchError(`${failed} expense(s) failed to save. Others saved successfully.`);
      } else {
        setIsBatchModalOpen(false);
        setBatchExpenses([]);
        fetchExpenses();
      }
    } catch (err: any) {
      setBatchError(err.message || 'Failed to save expenses');
    } finally {
      setBatchSaving(false);
    }
  };

  const toggleBatchSelect = (idx: number) => {
    setBatchExpenses((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, selected: !e.selected } : e))
    );
  };

  const updateBatchField = (idx: number, field: keyof AIExtractedExpense, value: any) => {
    setBatchExpenses((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );
  };

  const getFilterMonths = () => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const display = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ val: mStr, label: display });
    }
    return list;
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const url = `/api/expenses?page=1&limit=100000&category=${selectedCategory}&month=${selectedMonth}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch expenses for export');
      }
      const data = await res.json();
      const exportExpenses: Expense[] = data.expenses || [];
      
      if (exportExpenses.length === 0) {
        alert('No expenses matching current filters to export.');
        return;
      }

      const escapeCSVField = (val: string) => {
        return `"${val.replace(/"/g, '""')}"`;
      };

      const headers = ['Date', 'Category', 'Note', 'Amount', 'Currency'];
      const rows = exportExpenses.map((exp) => [
        escapeCSVField(exp.date ? new Date(exp.date).toISOString().slice(0, 10) : ''),
        escapeCSVField(exp.category || 'Others'),
        escapeCSVField(exp.note || ''),
        escapeCSVField(exp.amount.toString()),
        escapeCSVField(exp.currency || 'USD'),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const urlBlob = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', urlBlob);
      
      const filterInfo = [];
      if (selectedCategory !== 'All') filterInfo.push(selectedCategory);
      if (selectedMonth !== 'All') filterInfo.push(selectedMonth);
      const fileNameSuffix = filterInfo.length > 0 ? `_${filterInfo.join('_')}` : '';
      
      link.setAttribute('download', `expenses${fileNameSuffix}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'An error occurred during CSV export.');
    } finally {
      setExporting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  const displayCurrency = user?.currency || 'USD';
  const toDisplay = (amt: number, fromCurr: string) =>
    convertCurrency(amt, fromCurr || 'USD', displayCurrency);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Expense Logs</h1>
            <p className="text-slate-400 text-sm mt-1">Add, edit, filter, and delete your expense records</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-500/5"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </button>
            <button
              onClick={() => { setIsAIModalOpen(true); setAiError(''); setAiText(''); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-pointer shadow-lg shadow-indigo-500/5"
            >
              <Sparkles className="h-4 w-4" />
              AI Auto-fill
            </button>
            <button
              onClick={() => openFormModal(null)}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-md">
          <div className="flex items-center gap-2 text-slate-400 text-sm w-full md:w-auto">
            <Search className="h-4 w-4" />
            <span className="font-semibold text-slate-300">Filters:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:flex-1 md:justify-end">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Category</span>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedCategory}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Month</span>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedMonth}
                onChange={(e) => handleFilterChange('month', e.target.value)}
              >
                <option value="All">All Months</option>
                {getFilterMonths().map((m) => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />{error}
          </div>
        )}

        {/* Expenses Table */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-500">Retrieving expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-20 text-slate-500 space-y-2">
              <p className="text-lg font-semibold text-slate-400">No expenses found</p>
              <p className="text-sm">Try tweaking filters or create a new entry!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 bg-slate-900/20">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Note / Description</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {expenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS['Others']}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                        {exp.note || <span className="italic text-slate-600">No details</span>}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="font-semibold text-white">
                          {formatAmount(toDisplay(exp.amount, exp.currency), displayCurrency)}
                        </div>
                        {exp.currency && exp.currency !== displayCurrency && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatAmount(exp.amount, exp.currency)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-3">
                          <button
                            onClick={() => openFormModal(exp)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp._id)}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-4 bg-slate-900/10">
              <span className="text-xs text-slate-500">
                Page <strong className="text-slate-300">{page}</strong> of{' '}
                <strong className="text-slate-300">{totalPages}</strong> ({totalCount} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════
          MODAL 1: Add / Edit Expense
      ═══════════════════════════════════════════════════ */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              {editingExpense ? 'Modify Expense Record' : 'Record New Expense'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{formError}</div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Amount + Currency row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Amount</label>
                  <div className="flex gap-2">
                    {/* Currency picker */}
                    <select
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 w-24 shrink-0"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {CURRENCY_SYMBOLS[c]} {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <select
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Note / Description (Optional)</label>
                <textarea
                  placeholder="e.g. Weekly grocery shopping at Walmart"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800/80 pt-5 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          MODAL 2: AI Text Input
      ═══════════════════════════════════════════════════ */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAIModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              AI Expense Auto-fill
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Paste bank SMS alerts, NEFT confirmations, pharmacy receipts, or any payment text.
              Our AI extracts all transactions automatically — even multiple at once.
            </p>

            {aiError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {aiError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Receipt / SMS / Bank Alert Text
                </label>
                <textarea
                  placeholder={`Examples:\nSBI Alert: Rs.599 paid to Netflix on 21-05-2026\nSBI Alert: Rs.450 paid to Uber on 22-05-2026\n\nor paste a full pharmacy receipt...`}
                  rows={7}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none text-sm font-mono"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAIModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAIExtract}
                  disabled={aiLoading || !aiText.trim()}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  {aiLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Analyze & Extract</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          MODAL 3: Batch Preview — review & confirm
      ═══════════════════════════════════════════════════ */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckCheck className="h-5 w-5 text-indigo-400" />
                  Review Extracted Expenses
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {batchExpenses.filter((e) => e.selected).length} of {batchExpenses.length} selected — edit any field before saving
                </p>
              </div>
              <button
                onClick={() => { setIsBatchModalOpen(false); setBatchExpenses([]); }}
                className="p-1 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              {batchError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-3">
                  {batchError}
                </div>
              )}

              {batchExpenses.map((exp, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 transition-all ${
                    exp.selected
                      ? 'border-indigo-500/40 bg-indigo-500/5'
                      : 'border-slate-800 bg-slate-900/30 opacity-50'
                  }`}
                >
                  {/* Row header: checkbox + note */}
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => toggleBatchSelect(idx)}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
                    >
                      {exp.selected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-500" />}
                    </button>
                    <input
                      type="text"
                      value={exp.note}
                      onChange={(e) => updateBatchField(idx, 'note', e.target.value)}
                      className="flex-1 bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-transparent focus:border-slate-600 pb-0.5 transition-colors"
                      placeholder="Description..."
                    />
                  </div>

                  {/* Fields row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-8">
                    {/* Amount + Currency */}
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Amount</label>
                      <div className="flex gap-1">
                        <select
                          value={exp.detectedCurrency}
                          onChange={(e) => updateBatchField(idx, 'detectedCurrency', e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-20"
                        >
                          {SUPPORTED_CURRENCIES.map((c) => (
                            <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={exp.amount}
                          onChange={(e) => updateBatchField(idx, 'amount', Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Category</label>
                      <select
                        value={exp.category}
                        onChange={(e) => updateBatchField(idx, 'category', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 sm:col-span-2">
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Date</label>
                      <input
                        type="date"
                        value={exp.date}
                        onChange={(e) => updateBatchField(idx, 'date', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => setBatchExpenses((prev) => prev.map((e) => ({ ...e, selected: true })))}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Select All
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsBatchModalOpen(false); setBatchExpenses([]); }}
                  className="px-4 py-2 text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchSave}
                  disabled={batchSaving || batchExpenses.filter((e) => e.selected).length === 0}
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  {batchSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCheck className="h-4 w-4" /> Save {batchExpenses.filter((e) => e.selected).length} Expense{batchExpenses.filter((e) => e.selected).length !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
