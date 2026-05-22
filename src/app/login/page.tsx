'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Loader2 } from 'lucide-react';
import { UI_CLASSES } from '@/lib/design';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) setError(result.error || 'Invalid credentials');
  };

  const inputCls = UI_CLASSES.authInput;

  return (
    <div className={UI_CLASSES.authPageWrapper}>

      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className={`w-10 h-10 ${UI_CLASSES.logoMarkLg} mb-4`}>
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-zinc-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className={UI_CLASSES.authCard}>
          {error && (
            <div className={`mb-4 ${UI_CLASSES.alertError}`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className={inputCls}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className={inputCls}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={UI_CLASSES.primaryButton + " mt-2"}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  );
}