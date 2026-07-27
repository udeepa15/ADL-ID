'use client';

import { TrendingUp, Clock, Printer, CheckCircle2, AlertCircle } from 'lucide-react';

interface Application {
  id: string;
  orgId: string;
  status: string;
  timestamp?: string;
}

interface DashboardChartsProps {
  applications: Application[];
}

export function ApplicationTrendChart({ applications }: DashboardChartsProps) {
  // Mock weekly trends based on real count or generated distribution
  const total = applications.length;
  const dataPoints = [
    { day: 'Mon', count: Math.max(1, Math.round(total * 0.12)) },
    { day: 'Tue', count: Math.max(2, Math.round(total * 0.18)) },
    { day: 'Wed', count: Math.max(3, Math.round(total * 0.25)) },
    { day: 'Thu', count: Math.max(2, Math.round(total * 0.20)) },
    { day: 'Fri', count: Math.max(4, Math.round(total * 0.35)) },
    { day: 'Sat', count: Math.max(1, Math.round(total * 0.10)) },
    { day: 'Sun', count: Math.max(2, Math.round(total * 0.15)) },
  ];

  const maxVal = Math.max(...dataPoints.map(d => d.count), 5);
  const width = 500;
  const height = 140;

  // Build SVG Path string
  const points = dataPoints.map((d, index) => {
    const x = (index / (dataPoints.length - 1)) * (width - 40) + 20;
    const y = height - (d.count / maxVal) * (height - 40) - 20;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${width - 20},${height - 10} L 20,${height - 10} Z`;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Application Velocity</h3>
          <p className="text-xs text-slate-400">Card requests submitted past 7 days</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+14.2%</span>
        </span>
      </div>

      <div className="w-full relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          <line x1="20" y1="30" x2={width - 20} y2="30" stroke="#f1f5f9" strokeDasharray="4 4" />
          <line x1="20" y1="70" x2={width - 20} y2="70" stroke="#f1f5f9" strokeDasharray="4 4" />
          <line x1="20" y1="110" x2={width - 20} y2="110" stroke="#f1f5f9" strokeDasharray="4 4" />

          {/* Area Gradient Fill */}
          <path d={areaPath} fill="url(#blueGradient)" />

          {/* Trend Line */}
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Nodes */}
          {dataPoints.map((d, index) => {
            const x = (index / (dataPoints.length - 1)) * (width - 40) + 20;
            const y = height - (d.count / maxVal) * (height - 40) - 20;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                className="fill-white stroke-blue-600 stroke-2 hover:r-6 transition-all cursor-pointer"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between px-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
        {dataPoints.map(d => (
          <span key={d.day}>{d.day}</span>
        ))}
      </div>
    </div>
  );
}

export function StatusDistributionChart({ applications }: DashboardChartsProps) {
  const total = applications.length || 1;
  const pending = applications.filter(a => a.status === 'Pending').length;
  const printing = applications.filter(a => a.status === 'Printing').length;
  const ready = applications.filter(a => a.status === 'Ready').length;
  const rejected = applications.filter(a => a.status === 'Rejected').length;

  const pct = (val: number) => Math.round((val / total) * 100);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Fulfillment Pipeline</h3>
        <p className="text-xs text-slate-400">Current card processing distribution</p>
      </div>

      <div className="space-y-3.5">
        {/* Pending */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Approval
            </span>
            <span className="font-semibold text-slate-900">{pending} ({pct(pending)}%)</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct(pending)}%` }}></div>
          </div>
        </div>

        {/* Printing */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-blue-600" /> Printing Queue
            </span>
            <span className="font-semibold text-slate-900">{printing} ({pct(printing)}%)</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct(printing)}%` }}></div>
          </div>
        </div>

        {/* Ready */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ready for Collection
            </span>
            <span className="font-semibold text-slate-900">{ready} ({pct(ready)}%)</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${pct(ready)}%` }}></div>
          </div>
        </div>

        {/* Rejected */}
        {rejected > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Rejected / Error
              </span>
              <span className="font-semibold text-slate-900">{rejected} ({pct(rejected)}%)</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${pct(rejected)}%` }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
