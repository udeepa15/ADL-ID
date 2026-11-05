'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Building2, CheckCircle2, Clock, CreditCard, Inbox, Printer, RefreshCw } from 'lucide-react';
import SaaSLayout, { type NavKey } from '@/components/SaaSLayout';
import ApplicationsTable from '@/components/ApplicationsTable';
import OrganizationsPanel from '@/components/shop/OrganizationsPanel';
import { ApplicationTrendChart, StatusDistributionChart } from '@/components/DashboardCharts';
import { Alert, Button, Card, EmptyState, LoadingState, PageHeader, PhotoThumb, StatCard, StatusBadge, buttonClasses } from '@/components/ui';
import { authFetch } from '@/lib/apiClient';
import { useRequiredRole } from '@/lib/useRequiredRole';
import { formatDate, sortNewestFirst, type Application, type OrgConfig, type Status } from '@/lib/types';

const TABS: { key: NavKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'applications', label: 'Applications' },
  { key: 'organizations', label: 'Organizations' },
];

function parseTab(value: string | null): NavKey {
  return value === 'applications' || value === 'organizations' ? value : 'overview';
}

function ShopDashboard() {
  const me = useRequiredRole('shop');
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = parseTab(searchParams.get('tab'));
  const orgParam = searchParams.get('org') || '';

  const [applications, setApplications] = useState<Application[]>([]);
  const [organizations, setOrganizations] = useState<OrgConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      const [appsRes, orgsRes] = await Promise.all([authFetch('/api/applications'), authFetch('/api/organizations')]);
      if (!appsRes.ok || !orgsRes.ok) throw new Error('The server could not load dashboard data.');
      const [appsData, orgsData] = await Promise.all([appsRes.json(), orgsRes.json()]);
      setApplications(appsData.applications || []);
      setOrganizations(orgsData.organizations || []);
      setLoadError('');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoadError(err instanceof Error ? err.message : 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load once access is confirmed. State is only set after the fetch resolves.
  useEffect(() => {
    if (!me) return;
    void (async () => {
      await load();
    })();
  }, [me, load]);

  const updateStatus = async (app: Application, status: Status) => {
    setActionError('');
    const res = await authFetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, status, orgId: app.orgId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = `Couldn't update ${app.name}: ${data.error || 'request failed'}`;
      setActionError(message);
      throw new Error(message);
    }
    setApplications((apps) => apps.map((a) => (a.id === app.id ? { ...a, status } : a)));
  };

  const goTab = (key: NavKey) => router.replace(key === 'overview' ? '/shop-dashboard' : `/shop-dashboard?tab=${key}`, { scroll: false });

  if (!me) {
    return <SaaSLayout me={null}><LoadingState label="Checking your access…" /></SaaSLayout>;
  }

  const count = (s: Status) => applications.filter((a) => a.status === s).length;
  const orgIds = Array.from(new Set([...organizations.map((o) => o.orgId), ...applications.map((a) => a.orgId)])).sort();
  const recent = sortNewestFirst(applications).slice(0, 5);

  return (
    <SaaSLayout me={me} active={tab}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Shop admin"
          title={TABS.find((t) => t.key === tab)!.label}
          description={
            tab === 'overview'
              ? 'Card requests across every organization at a glance.'
              : tab === 'applications'
                ? 'Review staff applications and move cards through printing.'
                : 'Set up client organizations, their forms and QR codes.'
          }
          actions={
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); load(); }} loading={loading}>
              {!loading && <RefreshCw className="w-4 h-4" aria-hidden="true" />} Refresh
            </Button>
          }
        />

        {/* In-page tabs (mirrors the sidebar; handy on tablets) */}
        <div role="tablist" aria-label="Sections" className="flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => goTab(t.key)}
              className={`relative px-4 py-2.5 font-heading text-[15px] font-semibold whitespace-nowrap transition-colors ${
                tab === t.key ? 'text-brand-600' : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden="true" />}
            </button>
          ))}
        </div>

        {loadError && (
          <Alert tone="error" title="Couldn't load data" action={<Button size="sm" variant="outline" onClick={() => { setLoading(true); load(); }}>Try again</Button>}>
            {loadError}
          </Alert>
        )}
        {actionError && <Alert tone="error" onDismiss={() => setActionError('')}>{actionError}</Alert>}

        {loading && applications.length === 0 && organizations.length === 0 ? (
          <LoadingState label="Loading dashboard…" />
        ) : tab === 'overview' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total applications" value={applications.length} hint={`${organizations.length} organizations`} icon={CreditCard} tone="brand" />
              <StatCard label="Pending review" value={count('Pending')} hint="Waiting to print" icon={Clock} />
              <StatCard label="Printing" value={count('Printing')} hint="In production" icon={Printer} tone="accent" />
              <StatCard label="Ready" value={count('Ready')} hint="For collection" icon={CheckCircle2} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ApplicationTrendChart applications={applications} />
              <StatusDistributionChart applications={applications} />
            </div>

            <Card>
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                <h2 className="font-heading font-bold text-ink">Latest applications</h2>
                <Link href="/shop-dashboard?tab=applications" className="inline-flex items-center gap-1.5 font-heading text-sm font-bold text-brand-600 hover:text-brand">
                  View all <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
              {recent.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No applications yet"
                  description="Create an organization and share its QR code with staff to start receiving applications."
                  action={<button type="button" onClick={() => goTab('organizations')} className={buttonClasses('primary', 'sm')}><Building2 className="w-4 h-4" aria-hidden="true" /> Set up an organization</button>}
                />
              ) : (
                <ul className="divide-y divide-line">
                  {recent.map((app) => (
                    <li key={app.id} className="flex items-center gap-3 px-5 py-3">
                      <PhotoThumb src={app.photoUrl} name={app.name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink truncate">{app.name}</p>
                        <p className="text-[13px] text-muted truncate">
                          <span className="font-mono font-semibold text-brand-600">{app.orgId}</span> · {app.role} · {formatDate(app.timestamp)}
                        </p>
                      </div>
                      <StatusBadge status={app.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        ) : tab === 'applications' ? (
          <ApplicationsTable
            key={orgParam}
            applications={applications}
            orgOptions={orgIds}
            initialOrg={orgParam}
            onStatusChange={updateStatus}
            emptyState={
              <EmptyState
                icon={Inbox}
                title="No applications yet"
                description="Applications appear here as soon as staff submit the form from their organization's QR code."
              />
            }
          />
        ) : (
          <OrganizationsPanel organizations={organizations} applications={applications} onChanged={load} />
        )}
      </div>
    </SaaSLayout>
  );
}

export default function ShopDashboardPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ShopDashboard />
    </Suspense>
  );
}
