import Link from 'next/link';
import { CreditCard, QrCode, ShieldCheck, UserCheck, ArrowRight, Sparkles, Building2, FileSpreadsheet, CheckCircle, Layers, Lock } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">ADL ID Pass</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Enterprise SaaS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/apply?org=GH-2026"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Apply for Card</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-20 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-blue-600 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Modern Smart ID Card Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Automated ID Card Issuing & <span className="text-blue-600">Dynamic SaaS Workflows</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Instant QR invitation setup, dynamic form fields, Vercel Blob cloud photo storage, and isolated Google Sheets multi-tab sync.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/apply?org=GH-2026"
              className="w-full sm:w-auto px-7 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Submit Employee Application</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Portal Login</span>
            </Link>
          </div>
        </div>

        {/* Portals Showcase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Card 1: Shop Admin */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Shop Admin Portal</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Define custom form fields, generate SVG QR codes, issue automated client user credentials, and manage printing status queues.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 gap-1.5 group-hover:translate-x-1 transition-transform"
            >
              <span>Access Shop Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Client Portal */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Client Dashboard</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Isolated view for organization managers to monitor employee ID card status from Pending to Printing and Ready for pick-up.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-semibold text-slate-700 hover:text-slate-900 gap-1.5 group-hover:translate-x-1 transition-transform"
            >
              <span>Access Client Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Employee Form */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Dynamic Application Form</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Scan QR or click organization link to submit profile photo, standard fields, and custom organization inputs seamlessly.
              </p>
            </div>
            <Link
              href="/apply?org=GH-2026"
              className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 gap-1.5 group-hover:translate-x-1 transition-transform"
            >
              <span>Open Form (GH-2026)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Feature Pill Grid */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Architecture & Integrations</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-900">Vercel Blob Storage</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Public & Private Stores</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-900">Google Sheets API</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Isolated Multi-Tab Sync</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-900">Firebase Auth</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Automated Client Accounts</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-900">SVG Vectors</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Instant QR Code Export</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} ADL ID Pass • Modern Light SaaS Platform</p>
        </div>
      </footer>
    </div>
  );
}
