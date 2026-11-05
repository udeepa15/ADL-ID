'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { fetchMe, type Me } from '@/lib/apiClient';
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
  const [me, setMe] = useState<Me | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setMe(null);
        return;
      }
      try {
        setMe(await fetchMe());
      } catch {
        setMe(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const isShop = me?.role === 'shop';
  const dashboardHref = isShop ? '/shop-dashboard' : '/client-dashboard';
  const navItems: { label: string; href: string; icon: typeof Home; isExternal?: boolean }[] = [
    { label: 'Overview', href: dashboardHref, icon: Home },
    { label: 'Applications', href: dashboardHref, icon: CreditCard },
    ...(me?.role === 'client'
      ? [{ label: 'Apply Form', href: `/apply?org=${encodeURIComponent(me.orgId)}`, icon: ShieldCheck, isExternal: false }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#212121] flex font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-[#E0E0E0] fixed inset-y-0 z-30">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#E0E0E0]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#D81B60] text-white flex items-center justify-center font-bold shadow-md shadow-[#D81B60]/20 group-hover:bg-[#C2185B] transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-base text-[#212121] tracking-tight block leading-none">ADL ID Pass</span>
              <span className="text-[10px] font-semibold text-[#212121]/50">Enterprise SaaS</span>
            </div>
          </Link>
          <span className="px-2 py-0.5 rounded-full bg-[#D81B60]/10 text-[#D81B60] text-[10px] font-semibold border border-[#D81B60]/20">v1.2</span>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#212121]/50">
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
                    ? 'bg-[#D81B60]/10 text-[#D81B60] font-semibold shadow-xs'
                    : 'text-[#212121]/70 hover:text-[#212121] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D81B60]' : 'text-[#212121]/40'}`} />
                  <span>{item.label}</span>
                </div>
                {item.isExternal && <ExternalLink className="w-3 h-3 text-[#212121]/40" />}
              </Link>
            );
          })}

          <div className="pt-6 px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#212121]/50">
            Portals & Shortcuts
          </div>

          <Link
            href="/shop-dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm text-[#212121]/70 hover:text-[#212121] hover:bg-[#F8FAFC] rounded-lg font-medium transition-all"
          >
            <Building2 className="w-4 h-4 text-[#212121]/40" />
            <span>Shop Admin Portal</span>
          </Link>

          <Link
            href="/client-dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm text-[#212121]/70 hover:text-[#212121] hover:bg-[#F8FAFC] rounded-lg font-medium transition-all"
          >
            <UserIcon className="w-4 h-4 text-[#212121]/40" />
            <span>Client Dashboard</span>
          </Link>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-[#E0E0E0] bg-[#F8FAFC]/50">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-[#D81B60]/10 text-[#D81B60] font-semibold flex items-center justify-center text-xs shrink-0 border border-[#D81B60]/20">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-[#212121] truncate">{user.email}</p>
                  <p className="text-[10px] text-[#212121]/60 font-medium">
                    {isShop ? 'Shop Administrator' : 'Client Account'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-[#212121]/40 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 py-2 px-3 bg-[#D81B60] hover:bg-[#C2185B] text-white rounded-lg text-xs font-semibold shadow-sm shadow-[#D81B60]/20 transition-all"
            >
              <span>Sign In to Dashboard</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#212121]/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex-1 w-full max-w-xs bg-white flex flex-col z-10 border-r border-[#E0E0E0]">
            <div className="h-16 px-6 flex items-center justify-between border-b border-[#E0E0E0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D81B60] text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-[#212121]">ADL ID Pass</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-[#212121]/50 hover:text-[#212121]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#212121]/80 hover:bg-[#F8FAFC]"
                >
                  <item.icon className="w-4 h-4 text-[#212121]/40" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="p-4 border-t border-[#E0E0E0]">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F8FAFC] hover:bg-[#E0E0E0] text-[#212121] rounded-lg text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out ({user.email})</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full block text-center py-2.5 px-4 bg-[#D81B60] text-white rounded-lg text-xs font-semibold"
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
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#E0E0E0] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#212121]/70 hover:text-[#212121] rounded-lg hover:bg-[#F8FAFC]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-[#212121] tracking-tight">{pageTitle}</h1>
          </div>

          {/* Center Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-sm mx-8 relative">
            <Search className="w-4 h-4 text-[#212121]/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applications, orgs..."
              className="w-full pl-9 pr-12 py-1.5 bg-[#F8FAFC] border border-[#E0E0E0] rounded-lg text-xs text-[#212121] placeholder-[#212121]/40 focus:outline-none focus:border-[#0097A7] focus:bg-white focus:ring-1 focus:ring-[#0097A7] transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#212121]/40 bg-white px-1.5 py-0.5 rounded border border-[#E0E0E0] shadow-2xs">
              ⌘K
            </kbd>
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-[#212121]/70 hover:text-[#212121] rounded-lg hover:bg-[#F8FAFC] relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D81B60] border border-white"></span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#E0E0E0] p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2">
                    <span className="text-xs font-bold text-[#212121]">Notifications</span>
                    <span className="text-[10px] text-[#D81B60] font-semibold">2 New</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-[#D81B60]/5 border border-[#D81B60]/15">
                      <p className="font-semibold text-[#212121]">System Ready</p>
                      <p className="text-[#212121]/60 text-[11px]">Vercel Blob & Sheets synced successfully.</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E0E0E0]">
                      <p className="font-semibold text-[#212121]">Live Production</p>
                      <p className="text-[#212121]/60 text-[11px]">Deploy active on Next.js App Router.</p>
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
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#D81B60] text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#212121]/40 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E0E0E0] py-2 z-50 text-xs">
                    <div className="px-4 py-2 border-b border-[#E0E0E0]">
                      <p className="font-semibold text-[#212121] truncate">{user.email}</p>
                      <p className="text-[10px] text-[#212121]/60">{isShop ? 'Administrator' : 'Client User'}</p>
                    </div>
                    <Link
                      href="/shop-dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-[#212121]/80 hover:bg-[#F8FAFC] font-medium"
                    >
                      Shop Admin Portal
                    </Link>
                    <Link
                      href="/client-dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-[#212121]/80 hover:bg-[#F8FAFC] font-medium"
                    >
                      Client Dashboard
                    </Link>
                    <div className="border-t border-[#E0E0E0] mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2"
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
                className="px-3 py-1.5 bg-[#D81B60] hover:bg-[#C2185B] text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
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
