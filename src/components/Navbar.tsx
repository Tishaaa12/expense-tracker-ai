'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Wallet, LogOut } from 'lucide-react';
import { UI_CLASSES } from '@/lib/design';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <nav className={UI_CLASSES.nav}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">

          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className={`w-7 h-7 ${UI_CLASSES.logoMark}`}>
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-white text-sm">AI Expense Tracker</span>
            </Link>

            <div className="flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/expenses"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/expenses'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                Expenses
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-zinc-700 text-white text-sm font-semibold flex items-center justify-center select-none">
              {initials}
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}