'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Me } from '@/lib/apiClient';
import { BrandMark } from '@/components/BrandMark';
import {
  Building2,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';

export type NavKey = 'overview' | 'applications' | 'organizations';

interface NavItem {
  key: NavKey | 'apply';
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

function navFor(me: Me | null): NavItem[] {
  if (me?.role === 'shop') {
    return [
      { key: 'overview', label: 'Overview', href: '/shop-dashboard', icon: LayoutDashboard },
      { key: 'applications', label: 'Applications', href: '/shop-dashboard?tab=applications', icon: CreditCard },
      { key: 'organizations', label: 'Organizations', href: '/shop-dashboard?tab=organizations', icon: Building2 },
    ];
  }
  if (me?.role === 'client') {
    return [
      { key: 'applications', label: 'Applications', href: '/client-dashboard', icon: CreditCard },
      { key: 'apply', label: 'Application form', href: `/apply?org=${encodeURIComponent(me.orgId)}`, icon: ExternalLink, external: true },
    ];
  }
  return [];
}

function NavLinks({ items, active, onNavigate }: { items: NavItem[]; active?: NavKey; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener' : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-heading text-[15px] font-semibold transition-colors ${
              isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-2 hover:bg-ink/5 hover:text-ink'
            }`}
          >
            {isActive && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-brand" aria-hidden="true" />}
            <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ me, onSignOut }: { me: Me | null; onSignOut: () => void }) {
  if (!me) return null;
  const roleLabel = me.role === 'shop' ? 'Shop admin' : `Client admin · ${me.orgId}`;
  return (
    <div className="border-t border-line p-4">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 shrink-0 rounded-full bg-ink text-white flex items-center justify-center font-heading font-bold text-sm" aria-hidden="true">
          {me.email.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{me.email}</p>
          <p className="text-xs text-muted truncate">{roleLabel}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-line-strong px-3 py-2 text-sm font-semibold text-ink-2 hover:border-ink hover:text-ink transition-colors"
      >
        <LogOut className="w-4 h-4" aria-hidden="true" />
        Sign out
      </button>
    </div>
  );
}

interface SaaSLayoutProps {
  children: ReactNode;
  me: Me | null;
  active?: NavKey;
}

export default function SaaSLayout({ children, me, active }: SaaSLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const items = navFor(me);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-soft">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-white border-r border-line">
        <div className="h-[72px] px-5 flex items-center border-b border-line">
          <Link href="/" aria-label="ADL ID Pass home"><BrandMark /></Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavLinks items={items} active={active} />
        </div>
        <UserFooter me={me} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-line px-4 flex items-center justify-between">
        <Link href="/" aria-label="ADL ID Pass home"><BrandMark /></Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="w-11 h-11 rounded-xl border border-line-strong flex items-center justify-center text-ink"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 right-0 w-[min(20rem,85vw)] bg-white shadow-dialog flex flex-col" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="h-16 px-4 flex items-center justify-between border-b border-line">
              <span className="font-heading font-bold text-ink">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="w-11 h-11 rounded-xl flex items-center justify-center text-ink hover:bg-ink/5"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavLinks items={items} active={active} onNavigate={() => setMenuOpen(false)} />
            </div>
            <UserFooter me={me} onSignOut={handleSignOut} />
          </div>
        </div>
      )}

      <main id="main" className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
