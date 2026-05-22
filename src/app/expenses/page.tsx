"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import {
  CURRENCY_SYMBOLS,
  SUPPORTED_CURRENCIES,
  formatAmount,
} from "@/lib/currency";
import LoadingScreen from "@/components/LoadingScreen";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { getRecentMonths } from "@/lib/dates";
import type { Expense, AIExtractedExpense } from "@/types";
import {
  Plus,
  Sparkles,
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
} from "lucide-react";

import { CATEGORIES, getCategoryBadgeClass, UI_CLASSES } from "@/lib/design";

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const { displayCurrency, toDisplay } = useDisplayCurrency(user?.currency);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(user?.currency || "INR");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [batchExpenses, setBatchExpenses] = useState<AIExtractedExpense[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user?.currency) setCurrency(user.currency);
  }, [user]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError("");
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
        setError(errData.error || "Failed to fetch expenses");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user, page, selectedCategory, selectedMonth]);

  const handleFilterChange = (type: "category" | "month", val: string) => {
    if (type === "category") setSelectedCategory(val);
    if (type === "month") setSelectedMonth(val);
    setPage(1);
  };

  const openFormModal = (expense: Expense | null = null) => {
    setFormError("");
    if (expense) {
      setEditingExpense(expense);
      setAmount(expense.amount.toString());
      setCurrency(expense.currency || user?.currency || "INR");
      setCategory(expense.category);
      setDate(expense.date.slice(0, 10));
      setNote(expense.note || "");
    } else {
      setEditingExpense(null);
      setAmount("");
      setCurrency(user?.currency || "INR");
      setCategory("Food");
      setDate(new Date().toISOString().slice(0, 10));
      setNote("");
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return setFormError("Please enter a valid positive amount.");
    if (!date) return setFormError("Please select a transaction date.");
    setSaving(true);
    try {
      const payload = {
        amount: Number(amount),
        currency,
        category,
        date,
        note,
      };
      const res = editingExpense
        ? await fetch(`/api/expenses/${editingExpense._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        setIsFormModalOpen(false);
        fetchExpenses();
      } else {
        const e = await res.json();
        setFormError(e.error || "Failed to save");
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleteModalOpen(false);
    try {
      const res = await fetch(`/api/expenses/${deletingId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (expenses.length === 1 && page > 1) setPage(page - 1);
        else fetchExpenses();
      } else {
        const e = await res.json();
        setError(e.error || "Failed to delete");
      }
    } catch {
      setError("An error occurred while deleting");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAIExtract = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const data = await res.json();
      if (res.ok && data.expenses?.length > 0) {
        setBatchExpenses(
          data.expenses.map((e: any) => ({
            amount: e.amount,
            detectedCurrency: e.detectedCurrency || user?.currency || "INR",
            category: e.category || "Others",
            date: e.date || new Date().toISOString().slice(0, 10),
            note: e.note || "",
            selected: true,
          })),
        );
        setBatchError("");
        setIsAIModalOpen(false);
        setIsBatchModalOpen(true);
        setAiText("");
      } else if (res.ok && data.expenses?.length === 0) {
        setAiError(
          "No transactions could be extracted. Please try different input.",
        );
      } else {
        setAiError(data.error || "AI parsing failed.");
      }
    } catch (err: any) {
      setAiError(err.message || "Network error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleBatchSave = async () => {
    const toSave = batchExpenses.filter((e) => e.selected);
    if (toSave.length === 0) return;
    setBatchSaving(true);
    setBatchError("");
    try {
      const results = await Promise.all(
        toSave.map((e) =>
          fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: e.amount,
              currency: e.detectedCurrency,
              category: e.category,
              date: e.date,
              note: e.note,
            }),
          }),
        ),
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) setBatchError(`${failed} expense(s) failed to save.`);
      else {
        setIsBatchModalOpen(false);
        setBatchExpenses([]);
        fetchExpenses();
      }
    } catch (err: any) {
      setBatchError(err.message || "Failed to save expenses");
    } finally {
      setBatchSaving(false);
    }
  };

  const toggleBatchSelect = (idx: number) =>
    setBatchExpenses((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, selected: !e.selected } : e)),
    );

  const updateBatchField = (
    idx: number,
    field: keyof AIExtractedExpense,
    value: any,
  ) =>
    setBatchExpenses((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/expenses?page=1&limit=100000&category=${selectedCategory}&month=${selectedMonth}`,
      );
      if (!res.ok) throw new Error("Failed to fetch expenses for export");
      const data = await res.json();
      const exportExpenses: Expense[] = data.expenses || [];
      if (exportExpenses.length === 0) {
        setError("No expenses to export.");
        return;
      }
      const esc = (val: string) => `"${val.replace(/"/g, '""')}"`;
      const headers = ["Date", "Category", "Note", "Amount", "Currency"];
      const rows = exportExpenses.map((exp) => [
        esc(exp.date ? new Date(exp.date).toISOString().slice(0, 10) : ""),
        esc(exp.category || "Others"),
        esc(exp.note || ""),
        esc(exp.amount.toString()),
        esc(exp.currency || "INR"),
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const suffix = [
        selectedCategory !== "All" ? selectedCategory : "",
        selectedMonth !== "All" ? selectedMonth : "",
      ]
        .filter(Boolean)
        .join("_");
      link.setAttribute(
        "download",
        `expenses${suffix ? "_" + suffix : ""}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={UI_CLASSES.pageWrapper}>
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Expense Logs</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Add, edit, filter, and manage your expense records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className={UI_CLASSES.secondaryButton}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </button>
            <button
              onClick={() => {
                setIsAIModalOpen(true);
                setAiError("");
                setAiText("");
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-emerald-400 hover:bg-zinc-700 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              AI Auto-fill
            </button>
            <button
              onClick={() => openFormModal(null)}
              className={`${UI_CLASSES.actionButton} font-semibold px-4`}
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <select
            className={UI_CLASSES.filterSelect}
            value={selectedCategory}
            onChange={(e) => handleFilterChange("category", e.target.value)}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            className={UI_CLASSES.filterSelect}
            value={selectedMonth}
            onChange={(e) => handleFilterChange("month", e.target.value)}
          >
            <option value="All">All Months</option>
            {getRecentMonths().map((m) => (
              <option key={m.val} value={m.val}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className={`${UI_CLASSES.alertError} flex items-center gap-2`}>
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-zinc-900 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm text-zinc-500">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 space-y-2">
              <p className="text-lg font-semibold text-zinc-400">
                No expenses found
              </p>
              <p className="text-sm">
                Try tweaking filters or add a new entry!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-500 bg-zinc-900">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Note</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm">
                  {expenses.map((exp) => (
                    <tr
                      key={exp._id}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-zinc-300 font-medium whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadgeClass(exp.category)}`}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 max-w-xs truncate">
                        {exp.note || (
                          <span className="italic text-zinc-600">
                            No details
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="font-semibold text-white">
                          {formatAmount(
                            toDisplay(exp.amount, exp.currency),
                            displayCurrency,
                          )}
                        </div>
                        {exp.currency && exp.currency !== displayCurrency && (
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {formatAmount(exp.amount, exp.currency)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-3">
                          <button
                            onClick={() => openFormModal(exp)}
                            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp._id)}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
            <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
              <span className="text-xs text-zinc-500">
                Page <strong className="text-zinc-300">{page}</strong> of{" "}
                <strong className="text-zinc-300">{totalPages}</strong> (
                {totalCount} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {isFormModalOpen && (
        <div className={UI_CLASSES.modalOverlay}>
          <div className={`${UI_CLASSES.modalBox} max-w-lg p-6`}>
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </h3>
            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {formError}
              </div>
            )}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Amount
                  </label>
                  <div className="flex gap-2">
                    <select
                      className={`${UI_CLASSES.select} w-24 shrink-0`}
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
                      className={UI_CLASSES.input}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Category
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <select
                      className={`${UI_CLASSES.input} pl-9`}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="date"
                    required
                    className={`${UI_CLASSES.input} pl-9`}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Note (Optional)
                </label>
                <textarea
                  placeholder="e.g. Weekly grocery shopping"
                  rows={3}
                  className={`${UI_CLASSES.input} resize-none`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAIModalOpen && (
        <div className={UI_CLASSES.modalOverlay}>
          <div className={`${UI_CLASSES.modalBox} max-w-lg p-6`}>
            <button
              onClick={() => setIsAIModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              AI Expense Auto-fill
            </h3>
            <p className="text-xs text-zinc-500 mb-5">
              Paste bank SMS, receipts, or payment texts. AI extracts all
              transactions automatically.
            </p>
            {aiError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {aiError}
              </div>
            )}
            <textarea
              placeholder={`Examples:\nSBI Alert: Rs.599 paid to Netflix on 21-05-2026\nSBI Alert: Rs.450 paid to Uber on 22-05-2026`}
              rows={7}
              className={`${UI_CLASSES.input} font-mono resize-none mb-4`}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
            />
            <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => setIsAIModalOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAIExtract}
                disabled={aiLoading || !aiText.trim()}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Analyze & Extract
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBatchModalOpen && (
        <div className={UI_CLASSES.modalOverlay}>
          <div className={`${UI_CLASSES.modalBox} max-w-2xl flex flex-col max-h-[90vh]`}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCheck className="h-5 w-5 text-emerald-400" />
                  Review Extracted Expenses
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {batchExpenses.filter((e) => e.selected).length} of{" "}
                  {batchExpenses.length} selected
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBatchModalOpen(false);
                  setBatchExpenses([]);
                }}
                className="p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              {batchError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {batchError}
                </div>
              )}
              {batchExpenses.map((exp, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 transition-all ${exp.selected ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/30 opacity-50"}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => toggleBatchSelect(idx)}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer shrink-0"
                    >
                      {exp.selected ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5 text-zinc-500" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={exp.note}
                      onChange={(e) =>
                        updateBatchField(idx, "note", e.target.value)
                      }
                      className="flex-1 bg-transparent text-white font-medium text-sm focus:outline-none border-b border-transparent focus:border-zinc-600 pb-0.5 transition-colors"
                      placeholder="Description..."
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-8">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">
                        Amount
                      </label>
                      <div className="flex gap-1">
                        <select
                          value={exp.detectedCurrency}
                          onChange={(e) =>
                            updateBatchField(
                              idx,
                              "detectedCurrency",
                              e.target.value,
                            )
                          }
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-1.5 py-1 text-xs text-white focus:outline-none w-20"
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
                          value={exp.amount}
                          onChange={(e) =>
                            updateBatchField(
                              idx,
                              "amount",
                              Number(e.target.value),
                            )
                          }
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">
                        Category
                      </label>
                      <select
                        value={exp.category}
                        onChange={(e) =>
                          updateBatchField(idx, "category", e.target.value)
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={exp.date}
                        onChange={(e) =>
                          updateBatchField(idx, "date", e.target.value)
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-zinc-800 flex items-center justify-between gap-3">
              <button
                onClick={() =>
                  setBatchExpenses((prev) =>
                    prev.map((e) => ({ ...e, selected: true })),
                  )
                }
                className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                Select All
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsBatchModalOpen(false);
                    setBatchExpenses([]);
                  }}
                  className="px-4 py-2 text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchSave}
                  disabled={
                    batchSaving ||
                    batchExpenses.filter((e) => e.selected).length === 0
                  }
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {batchSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCheck className="h-4 w-4" /> Save{" "}
                      {batchExpenses.filter((e) => e.selected).length} Expense
                      {batchExpenses.filter((e) => e.selected).length !== 1
                        ? "s"
                        : ""}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className={UI_CLASSES.modalOverlay}>
          <div className={`${UI_CLASSES.modalBox} max-w-md p-6`}>
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingId(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Delete Expense
              </h3>
              <p className="text-sm text-zinc-400">
                Are you sure? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingId(null);
                }}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 sm:flex-none px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
