'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Loader2 } from 'lucide-react';
import { UI_CLASSES } from '@/lib/design';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    const result = await register(email, password);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  const inputCls = UI_CLASSES.authInput;

  return (
    <div className={UI_CLASSES.authPageWrapper}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className={`w-10 h-10 ${UI_CLASSES.logoMarkLg} mb-4`}>
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-zinc-500 text-sm mt-1">Get started with AI expense tracking</p>
        </div>

        <div className={UI_CLASSES.authCard}>
          {error && (
            <div className={`mb-4 ${UI_CLASSES.alertError}`}>
              {error}
            </div>
          )}
          {success && (
            <div className={`mb-4 ${UI_CLASSES.alertSuccess} text-sm`}>
              Account created! Redirecting to login...
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

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                className={inputCls}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className={UI_CLASSES.primaryButton + " mt-2"}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}