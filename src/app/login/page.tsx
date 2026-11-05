'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { auth, firebaseConfigured } from '@/lib/firebase';
import { fetchMe, dashboardPathFor } from '@/lib/apiClient';
import { BrandMark } from '@/components/BrandMark';
import { Alert, Button, TextField } from '@/components/ui';

function authErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'That email and password don’t match an account.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes, or reset your password.';
    case 'auth/network-request-failed':
      return 'Can’t reach the sign-in service. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact ADL Digi House.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('denied') ? 'This account has not been granted access to any portal.' : '');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
      return;
    }
    try {
      // The server decides the role; email text is never trusted for this.
      const me = await fetchMe();
      if (!me) {
        await signOut(auth);
        setError('This account has not been granted access to any portal.');
        setLoading(false);
        return;
      }
      router.push(dashboardPathFor(me));
    } catch {
      await signOut(auth);
      setError('Signed in, but the server could not confirm your access. Please try again.');
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
      if (code === 'auth/network-request-failed' || code === 'auth/too-many-requests' || code === 'auth/invalid-email') {
        setError(authErrorMessage(err));
        setLoading(false);
        return;
      }
      // Other errors (e.g. unknown user) are not revealed, to avoid confirming which emails exist.
    }
    setNotice(`If an account exists for ${email.trim()}, a password reset link is on its way.`);
    setMode('signin');
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-pop">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {mode === 'signin' ? 'Sign in' : 'Reset your password'}
        </h1>
        <p className="text-[15px] text-muted mt-1">
          {mode === 'signin'
            ? 'For ADL Digi House staff and client organization admins.'
            : 'Enter your account email and we’ll send you a reset link.'}
        </p>

        <div className="mt-6 space-y-4">
          {!firebaseConfigured && (
            <Alert tone="warning" title="Sign-in isn't configured">
              The Firebase settings are missing. Add the <code>NEXT_PUBLIC_FIREBASE_*</code> values to <code>.env.local</code> and restart the server.
            </Alert>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
        </div>

        {mode === 'signin' ? (
          <form onSubmit={handleLogin} className="mt-4 space-y-4">
            <TextField
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.lk"
            />
            <div>
              <TextField
                label="Password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(''); setNotice(''); }}
                className="mt-2 text-sm font-semibold text-brand-600 hover:text-brand"
              >
                Forgot password?
              </button>
            </div>
            <Button type="submit" loading={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="mt-4 space-y-4">
            <TextField
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode('signin'); setError(''); }}>
              Back to sign in
            </Button>
          </form>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Staff applying for a card don’t need an account. Scan your organization’s QR code instead.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-soft flex flex-col">
      <header className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        <Link href="/" aria-label="ADL ID Pass home"><BrandMark /></Link>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Home
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
