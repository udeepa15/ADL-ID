'use client';

import { useMemo, useState } from 'react';
import { Card, STATUS_META } from '@/components/ui';
import { STATUSES, type Application } from '@/lib/types';

const DAYS = 14;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Applications received per day over the last 14 days, computed from real timestamps.
 * Single series → no legend; the title names it. Hover/focus a bar for its exact value.
 */
export function ApplicationTrendChart({ applications }: { applications: Application[] }) {
  const [active, setActive] = useState<number | null>(null);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: DAYS }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (DAYS - 1 - i));
      return { date, key: dayKey(date), count: 0 };
    });
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    for (const app of applications) {
      const t = new Date(app.timestamp);
      if (Number.isNaN(t.getTime())) continue;
      const i = index.get(dayKey(t));
      if (i !== undefined) buckets[i].count++;
    }
    return buckets;
  }, [applications]);

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(...days.map((d) => d.count), 2);
  // A tidy axis top whose midpoint is a whole number: 2, 4, 6, 10, 20, 40…
  const niceMax = (() => {
    const pow = 10 ** Math.floor(Math.log10(max));
    return [1, 2, 4, 6, 10].map((m) => m * pow).find((v) => v >= max) ?? max;
  })();
  const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading font-bold text-ink">Applications received</h3>
          <p className="text-sm text-muted">Last {DAYS} days</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-2xl font-extrabold text-ink tabular-nums">{total}</p>
          <p className="text-sm text-muted">in period</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3" aria-hidden="true">
        {/* Y axis */}
        <div className="flex flex-col justify-between text-xs text-muted tabular-nums h-36 py-0.5 text-right w-6">
          <span>{niceMax}</span>
          <span>{niceMax / 2}</span>
          <span>0</span>
        </div>
        {/* Plot */}
        <div className="relative flex-1 h-36">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-dashed border-line" />
            <div className="border-t border-dashed border-line" />
            <div className="border-t border-line-strong" />
          </div>
          <div className="absolute inset-0 flex items-end gap-0.5">
            {days.map((d, i) => (
              <div
                key={d.key}
                className="relative flex-1 h-full flex items-end justify-center cursor-default"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                <div
                  className={`w-full max-w-5 rounded-t-[4px] transition-colors ${active === i ? 'bg-brand-600' : 'bg-brand'}`}
                  style={{ height: d.count === 0 ? 0 : `max(${(d.count / niceMax) * 100}%, 3px)` }}
                />
                {active === i && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-pop">
                    <span className="font-semibold tabular-nums">{d.count}</span> on {fmtDay(d.date)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted mt-2 pl-9" aria-hidden="true">
        <span>{fmtDay(days[0].date)}</span>
        <span>{fmtDay(days[Math.floor(DAYS / 2)].date)}</span>
        <span>Today</span>
      </div>

      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>Applications received per day, last {DAYS} days</caption>
        <thead>
          <tr><th scope="col">Date</th><th scope="col">Applications</th></tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.key}><td>{fmtDay(d.date)}</td><td>{d.count}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/** Where cards are in the pipeline. Each status carries its icon + label, never color alone. */
export function StatusDistributionChart({ applications }: { applications: Application[] }) {
  const counts = STATUSES.map((s) => ({
    status: s,
    count: applications.filter((a) => (a.status || 'Pending') === s).length,
  }));
  const total = applications.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <Card className="p-5 sm:p-6">
      <div>
        <h3 className="font-heading font-bold text-ink">Fulfilment pipeline</h3>
        <p className="text-sm text-muted">Where every card is right now</p>
      </div>

      {/* Stacked bar with 2px surface gaps between segments */}
      <div className="mt-6 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-soft" aria-hidden="true">
        {counts
          .filter((c) => c.count > 0)
          .map((c) => (
            <div
              key={c.status}
              className={`${STATUS_META[c.status].bar} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(c.count / total) * 100}%` }}
              title={`${c.status}: ${c.count}`}
            />
          ))}
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3">
        {counts.map(({ status, count }) => {
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          return (
            <li key={status} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${meta.bg} ${meta.text}`}>
                <Icon className="w-4 h-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted">{meta.label}</p>
                <p className="font-heading font-bold text-ink tabular-nums">
                  {count} <span className="text-sm font-medium text-muted">· {pct(count)}%</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
