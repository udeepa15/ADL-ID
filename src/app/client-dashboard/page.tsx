'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, CreditCard, Inbox, Printer, QrCode, RefreshCw } from 'lucide-react';
import SaaSLayout from '@/components/SaaSLayout';
import ApplicationsTable from '@/components/ApplicationsTable';
import { StatusDistributionChart } from '@/components/DashboardCharts';
import { QrDialog } from '@/components/QrDialog';
import { Alert, Button, EmptyState, LoadingState, PageHeader, StatCard } from '@/components/ui';
import { authFetch } from '@/lib/apiClient';
import { useRequiredRole } from '@/lib/useRequiredRole';
import type { Application } from '@/lib/types';

export default function ClientDashboard() {
  const me = useRequiredRole('client');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      // The server scopes this to the signed-in client's organization.
      const res = await authFetch('/api/applications');
      if (!res.ok) throw new Error('The server could not load your applications.');
      const data = await res.json();
      setApplications(data.applications || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not load your applications.');
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

  if (!me) {
    return <SaaSLayout me={null}><LoadingState label="Checking your access…" /></SaaSLayout>;
  }

  const count = (s: string) => applications.filter((a) => a.status === s).length;
  const shareButton = (
    <Button size="sm" onClick={() => setQrOpen(true)}>
      <QrCode className="w-4 h-4" aria-hidden="true" /> Share application form
    </Button>
  );

  return (
    <SaaSLayout me={me} active="applications">
      <div className="space-y-6">
        <PageHeader
          eyebrow={`Organization · ${me.orgId}`}
          title="Staff ID cards"
          description="Track every application from submission to collection. Status updates come from ADL Digi House."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => { setLoading(true); load(); }} loading={loading}>
                {!loading && <RefreshCw className="w-4 h-4" aria-hidden="true" />} Refresh
              </Button>
              {shareButton}
            </>
          }
        />

        {error && (
          <Alert tone="error" title="Couldn't load applications" action={<Button size="sm" variant="outline" onClick={() => { setLoading(true); load(); }}>Try again</Button>}>
            {error}
          </Alert>
        )}

        {loading && applications.length === 0 ? (
          <LoadingState label="Loading applications…" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total" value={applications.length} icon={CreditCard} tone="brand" />
              <StatCard label="Pending" value={count('Pending')} hint="Received" icon={Clock} />
              <StatCard label="Printing" value={count('Printing')} hint="In production" icon={Printer} tone="accent" />
              <StatCard label="Ready" value={count('Ready')} hint="For collection" icon={CheckCircle2} />
            </div>

            {applications.length > 0 && <StatusDistributionChart applications={applications} />}

            <ApplicationsTable
              applications={applications}
              emptyState={
                <EmptyState
                  icon={Inbox}
                  title="No applications yet"
                  description="Share your organization's QR code or link with staff. Their applications will appear here."
                  action={shareButton}
                />
              }
            />
          </>
        )}
      </div>

      <QrDialog open={qrOpen} orgId={me.orgId} onClose={() => setQrOpen(false)} />
    </SaaSLayout>
  );
}
