import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, ClipboardList, Printer, QrCode, ScanLine, UserCheck } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';

const btn = 'inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-xl border-[1.5px] font-heading font-bold text-[15px] transition-colors';

const STEPS = [
  {
    icon: QrCode,
    title: 'We set up your organization',
    body: 'ADL Digi House creates your form, with any extra fields you need, and gives you a QR code and an admin login.',
  },
  {
    icon: ScanLine,
    title: 'Staff scan and apply',
    body: 'Staff scan the code on their phone, fill in their details and take a photo. No app or account needed.',
  },
  {
    icon: Printer,
    title: 'We print, you track',
    body: 'Cards move from Pending to Printing to Ready, and your admin can see each one’s status at any time.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <BrandMark />
          <Link href="/login" className={`${btn} bg-ink border-transparent text-white hover:bg-ink-2`}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-soft">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <p className="font-heading text-xs font-bold uppercase tracking-[0.12em] text-brand-600">Staff ID cards · ADL Digi House</p>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-[-0.035em] leading-[1.07] text-ink text-balance">
                ID cards for your whole team, <span className="text-brand">without the paperwork.</span>
              </h1>
              <p className="mt-5 text-lg text-ink-2 max-w-xl">
                Your staff apply from their phones with one QR code. We print the cards, and you follow every one
                from request to collection.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className={`${btn} bg-brand border-transparent text-white hover:bg-brand-600`}>
                  Sign in to your portal <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <a href="#how-it-works" className={`${btn} border-ink text-ink hover:bg-ink hover:text-white`}>
                  How it works
                </a>
              </div>
              <p className="mt-6 text-sm text-muted">
                Applying for a card? Scan the QR code from your HR team. You don’t need an account.
              </p>
            </div>

            {/* Illustrative card */}
            <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
              <div className="absolute -right-6 -bottom-6 w-2/3 h-2/3 rounded-3xl bg-[radial-gradient(rgba(230,0,126,0.28)_1.6px,transparent_1.8px)] [background-size:14px_14px]" />
              <div className="relative rounded-3xl bg-white border border-line shadow-pop overflow-hidden">
                <div className="h-20 bg-ink px-6 flex items-center justify-between">
                  <span className="font-heading font-extrabold text-white">City Hospital</span>
                  <span className="w-8 h-8 rounded-lg bg-brand" />
                </div>
                <div className="p-6 flex gap-5">
                  <div className="w-24 aspect-[4/5] rounded-xl bg-soft border border-line" />
                  <div className="flex-1 space-y-3 pt-1">
                    <div className="h-3.5 w-3/4 rounded bg-ink/80" />
                    <div className="h-3 w-1/2 rounded bg-line-strong" />
                    <div className="h-3 w-1/3 rounded bg-line-strong" />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-ready-bg px-2.5 py-1 text-[13px] font-semibold text-status-ready">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="font-heading text-xs font-bold uppercase tracking-[0.12em] text-brand-600">How it works</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">Three steps from request to card</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-2xl border border-line p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="font-heading text-sm font-bold text-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-[15px] text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Portals */}
        <section className="bg-soft">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid gap-5 md:grid-cols-2">
            {[
              { icon: UserCheck, title: 'For organizations', body: 'Track your staff’s cards, share your application QR code, and see what’s ready for collection.', tone: 'bg-accent-50 text-accent-700' },
              { icon: Building2, title: 'For ADL Digi House staff', body: 'Set up client organizations, review applications and manage the print queue.', tone: 'bg-brand-50 text-brand-600' },
            ].map(({ icon: Icon, title, body, tone }) => (
              <div key={title} className="rounded-2xl bg-white border border-line p-6 sm:p-8 flex flex-col">
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-ink">{title}</h3>
                <p className="mt-2 text-[15px] text-muted flex-1">{body}</p>
                <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 font-heading font-bold text-brand-600 hover:text-brand">
                  Sign in <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-dark text-white/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark inverted />
          <div className="flex items-center gap-2 text-sm">
            <ClipboardList className="w-4 h-4 text-brand-light" aria-hidden="true" />
            <span>© {new Date().getFullYear()} ADL Digi House (Pvt) Ltd, Colombo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
