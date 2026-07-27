'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  CreditCard, 
  Building2, 
  QrCode, 
  Home, 
  ShieldCheck, 
  LogOut, 
  Search, 
  Bell, 
  Menu, 
  X, 
  User as UserIcon, 
  ChevronDown,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface SaaSLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function SaaSLayout({ children, pageTitle = 'Dashboard' }: SaaSLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const navItems = [
    { label: 'Overview', href: user?.email?.includes('shopadmin') ? '/shop-dashboard' : '/client-dashboard', icon: Home },
    { label: 'Applications', href: user?.email?.includes('shopadmin') ? '/shop-dashboard' : '/client-dashboard', icon: CreditCard },
    { label: 'Apply Form', href: '/apply?org=GH-2026', icon: ShieldCheck, isExternal: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200 fixed inset-y-0 z-30">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight block leading-none">ADL ID Pass</span>
              <span className="text-[10px] font-semibold text-slate-400">Enterprise SaaS</span>
            </div>
          </Link>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold border border-blue-100">v1.2</span>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href.includes('dashboard') && pathname.includes('dashboard'));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.isExternal && <ExternalLink className="w-3 h-3 text-slate-400" />}
              </Link>
            );
          })}

          <div className="pt-6 px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Portals & Shortcuts
          </div>

          <Link
            href="/shop-dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-all"
          >
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Shop Admin Portal</span>
          </Link>

          <Link
            href="/client-dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-all"
          >
            <UserIcon className="w-4 h-4 text-slate-400" />
            <span>Client Dashboard</span>
          </Link>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 truncate">{user.email}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {user.email?.includes('shopadmin') ? 'Shop Administrator' : 'Client Account'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <span>Sign In to Dashboard</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex-1 w-full max-w-xs bg-white flex flex-col z-10 border-r border-slate-200">
            <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-slate-900">ADL ID Pass</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <item.icon className="w-4 h-4 text-slate-400" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out ({user.email})</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full block text-center py-2.5 px-4 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Sticky Top Navigation Bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
          </div>

          {/* Center Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-sm mx-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applications, orgs..."
              className="w-full pl-9 pr-12 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              ⌘K
            </kbd>
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 border border-white"></span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    <span className="text-[10px] text-blue-600 font-semibold">2 New</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-100/60">
                      <p className="font-semibold text-slate-900">System Ready</p>
                      <p className="text-slate-500 text-[11px]">Vercel Blob & Sheets synced successfully.</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="font-semibold text-slate-900">Live Production</p>
                      <p className="text-slate-500 text-[11px]">Deploy active on Next.js App Router.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar / Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 truncate">{user.email}</p>
                      <p className="text-[10px] text-slate-500">{user.email?.includes('shopadmin') ? 'Administrator' : 'Client User'}</p>
                    </div>
                    <Link
                      href="/shop-dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Shop Admin Portal
                    </Link>
                    <Link
                      href="/client-dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Client Dashboard
                    </Link>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
