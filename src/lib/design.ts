export const CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Health',
  'Shopping',
  'Others',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const THEME = {
  background: '#09090b',
  foreground: '#f4f4f5',
  surface: '#18181b',
  surfaceMuted: '#27272a',
  border: '#27272a',
  borderInput: '#3f3f46',
  muted: '#71717a',
  mutedForeground: '#a1a1aa',
  dim: '#52525b',
  accent: '#10b981',
  accentHover: '#34d399',
  danger: '#ef4444',
  warning: '#f59e0b',
} as const;

export const CHART_THEME = {
  axisTick: THEME.mutedForeground,
  axisTickDim: THEME.dim,
  tooltipBg: THEME.surface,
  tooltipBorder: THEME.border,
  tooltipLabel: THEME.mutedForeground,
  cursorFill: 'rgba(255,255,255,0.04)',
  barCurrent: THEME.accent,
  barInactive: THEME.surfaceMuted,
} as const;

export const CATEGORY_HEX_COLORS: Record<Category, string> = {
  Food: '#10b981',
  Transport: '#6366f1',
  Utilities: '#f59e0b',
  Entertainment: '#ef4444',
  Health: '#a78bfa',
  Shopping: '#2dd4bf',
  Others: '#94a3b8',
};

export const CATEGORY_COLORS_ARRAY = CATEGORIES.map((cat) => CATEGORY_HEX_COLORS[cat]);

export const CATEGORY_TAILWIND_COLORS: Record<Category, string> = {
  Food: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Transport: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  Utilities: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Entertainment: 'text-red-400 bg-red-500/10 border-red-500/20',
  Health: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  Shopping: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  Others: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

export function getCategoryChartColor(categoryName: string): string {
  const idx = CATEGORIES.indexOf(categoryName as Category);
  return CATEGORY_COLORS_ARRAY[idx !== -1 ? idx : CATEGORIES.indexOf('Others')];
}

export function getCategoryBadgeClass(category: string): string {
  return (
    CATEGORY_TAILWIND_COLORS[category as Category] ?? CATEGORY_TAILWIND_COLORS.Others
  );
}

export const UI_CLASSES = {
  pageWrapper: 'flex flex-col min-h-screen bg-zinc-950 text-zinc-100',
  authPageWrapper: 'min-h-screen flex items-center justify-center bg-zinc-950 px-4',
  authCard: 'bg-zinc-900 rounded-2xl p-6',
  dashboardCard: 'bg-zinc-900 border border-zinc-800 rounded-xl p-6',
  nav: 'border-b border-zinc-800/60 bg-zinc-950 sticky top-0 z-50',
  input:
    'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm',
  authInput:
    'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm',
  select:
    'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm',
  filterSelect:
    'bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer hover:border-zinc-700 transition-colors',
  modalOverlay:
    'fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4',
  modalBox: 'w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl relative',
  primaryButton:
    'w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer',
  actionButton:
    'px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer',
  secondaryButton:
    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-50 transition-all cursor-pointer',
  alertError: 'p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm',
  alertErrorCompact: 'p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs',
  alertSuccess: 'p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs',
  logoMark: 'bg-emerald-500 rounded-md flex items-center justify-center',
  logoMarkLg: 'bg-emerald-500 rounded-xl flex items-center justify-center',
};

export const STATUS_CLASSES = {
  barExceeded: 'bg-red-500',
  barWarning: 'bg-amber-500',
  barOk: 'bg-emerald-500',
  textExceeded: 'text-red-400',
  textWarning: 'text-amber-400',
} as const;
