'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Check, Copy, KeyRound, Mail, Plus, QrCode, X } from 'lucide-react';
import { Alert, Button, Card, EmptyState, SectionTitle, TextField, buttonClasses } from '@/components/ui';
import { QrDialog } from '@/components/QrDialog';
import { authFetch } from '@/lib/apiClient';
import { ORG_ID_PATTERN, applyUrl, type Application, type OrgConfig } from '@/lib/types';

const RESERVED_FIELDS = ['application_id', 'org_id', 'timestamp', 'employee_name', 'role', 'blood_group', 'photo_url', 'status'];
const MAX_FIELDS = 15;

interface Created {
  orgId: string;
  clientEmail: string;
  generatedPassword: string | null;
  accountExisted: boolean;
}

function CredentialsBlock({ created }: { created: Created }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const lines = [
      `Organization ID: ${created.orgId}`,
      `Login email: ${created.clientEmail}`,
      created.generatedPassword ? `Password: ${created.generatedPassword}` : null,
      `Sign in: ${window.location.origin}/login`,
      `Staff application form: ${applyUrl(created.orgId)}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; values are visible on screen.
    }
  };

  return (
    <div className="space-y-3">
      <dl className="rounded-2xl border border-line bg-soft p-4 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted"><Building2 className="w-4 h-4" aria-hidden="true" /> Organization</dt>
          <dd className="font-mono font-bold text-brand-600">{created.orgId}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted"><Mail className="w-4 h-4" aria-hidden="true" /> Login email</dt>
          <dd className="font-semibold text-ink truncate">{created.clientEmail}</dd>
        </div>
        {created.generatedPassword && (
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted"><KeyRound className="w-4 h-4" aria-hidden="true" /> Password</dt>
            <dd className="font-mono font-bold text-ink bg-white border border-line-strong rounded-lg px-2 py-0.5 select-all">
              {created.generatedPassword}
            </dd>
          </div>
        )}
      </dl>

      {created.generatedPassword ? (
        <Alert tone="warning">This password is shown only once. Copy it now and share it with the client securely.</Alert>
      ) : (
        <Alert tone="warning" title="A login for this email already existed">
          No new password was generated and the existing one is unchanged. If you didn&apos;t create that account,
          delete it in the Firebase Console (Authentication → Users) and create the organization again.
        </Alert>
      )}

      <Button variant="outline" size="sm" onClick={copy} className="w-full">
        {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy account details'}
      </Button>
    </div>
  );
}

function CreateOrganizationForm({ onCreated }: { onCreated: (c: Created) => void }) {
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const [fieldInput, setFieldInput] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const orgIdError = orgId && !ORG_ID_PATTERN.test(orgId.trim())
    ? 'Use 2–40 letters, numbers, "-" or "_", starting with a letter or number.'
    : orgId.trim().toLowerCase() === 'sheet1' ? '"Sheet1" is reserved.' : '';

  const addField = () => {
    const value = fieldInput.trim();
    if (!value) return;
    if (value.length > 50) return setFieldError('Field names can be at most 50 characters.');
    if (RESERVED_FIELDS.includes(value.toLowerCase().replace(/\s+/g, '_'))) return setFieldError(`"${value}" is already a built-in field.`);
    if (fields.some((f) => f.toLowerCase() === value.toLowerCase())) return setFieldError(`"${value}" is already added.`);
    if (fields.length >= MAX_FIELDS) return setFieldError(`At most ${MAX_FIELDS} custom fields.`);
    setFields([...fields, value]);
    setFieldInput('');
    setFieldError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orgIdError) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await authFetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: orgId.trim(), clientEmail: email.trim(), customFields: fields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create organization');
      onCreated({
        orgId: data.orgId,
        clientEmail: data.clientEmail,
        generatedPassword: data.generatedPassword ?? null,
        accountExisted: Boolean(data.accountExisted),
      });
      setOrgId('');
      setEmail('');
      setFields([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">New organization</h2>
      <p className="text-sm text-muted mt-0.5">Creates its sheet tab, application form and client login.</p>

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate={false}>
        {error && <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert>}

        <TextField
          label="Organization ID"
          required
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="e.g. GH-2026"
          hint="Used in the QR link and as the sheet tab name."
          error={orgIdError}
          autoComplete="off"
        />
        <TextField
          label="Client admin email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@hospital.lk"
          hint="They'll sign in with this email to track their staff's cards."
          autoComplete="off"
        />

        <div>
          <label htmlFor="custom-field" className="block text-sm font-semibold text-ink-2 mb-1.5">Extra form fields (optional)</label>
          <p className="text-[13px] text-muted mb-2">Name, role, blood group and photo are always included.</p>
          <div className="flex gap-2">
            <input
              id="custom-field"
              value={fieldInput}
              onChange={(e) => { setFieldInput(e.target.value); setFieldError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField(); } }}
              placeholder="e.g. Employee ID"
              aria-describedby={fieldError ? 'custom-field-error' : undefined}
              className="flex-1 min-h-11 rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            <Button type="button" variant="outline" onClick={addField}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Add
            </Button>
          </div>
          {fieldError && <p id="custom-field-error" className="text-[13px] text-status-rejected mt-1.5">{fieldError}</p>}
          {fields.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Extra fields">
              {fields.map((f) => (
                <li key={f} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-white pl-3 pr-1 py-1 text-sm font-medium text-ink-2">
                  {f}
                  <button
                    type="button"
                    onClick={() => setFields(fields.filter((x) => x !== f))}
                    aria-label={`Remove ${f}`}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-ink/5"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" loading={submitting} disabled={Boolean(orgIdError)} className="w-full">
          {submitting ? 'Creating…' : 'Create organization'}
        </Button>
      </form>
    </Card>
  );
}

export default function OrganizationsPanel({
  organizations,
  applications,
  onChanged,
}: { organizations: OrgConfig[]; applications: Application[]; onChanged: () => void }) {
  const [created, setCreated] = useState<Created | null>(null);
  const [qrOrg, setQrOrg] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const counts = (orgId: string) => {
    const apps = applications.filter((a) => a.orgId.toLowerCase() === orgId.toLowerCase());
    return { total: apps.length, pending: apps.filter((a) => a.status === 'Pending').length };
  };
  const q = query.trim().toLowerCase();
  const visible = organizations.filter(
    (o) => !q || o.orgId.toLowerCase().includes(q) || o.clientEmail.toLowerCase().includes(q),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] items-start">
      <CreateOrganizationForm
        onCreated={(c) => {
          setCreated(c);
          onChanged();
        }}
      />

      <div className="space-y-4">
        <SectionTitle
          title={`Organizations (${organizations.length})`}
          description="Each has its own form, sheet tab and client login."
          actions={organizations.length > 6 ? (
            <>
              <label htmlFor="org-search" className="sr-only">Search organizations</label>
              <input
                id="org-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search organizations"
                className="min-h-10 rounded-xl border border-line-strong bg-white px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </>
          ) : undefined}
        />

        {organizations.length === 0 ? (
          <Card>
            <EmptyState icon={Building2} title="No organizations yet" description="Create your first organization to get its QR code and client login." />
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {visible.map((org) => {
              const c = counts(org.orgId);
              return (
                <li key={org.orgId}>
                  <Card className="p-5 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-brand-600">{org.orgId}</p>
                        <p className="text-sm text-muted truncate mt-0.5">{org.clientEmail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-heading text-xl font-extrabold text-ink tabular-nums">{c.total}</p>
                        <p className="text-xs text-muted">{c.pending} pending</p>
                      </div>
                    </div>
                    {org.customFields.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Extra fields">
                        {org.customFields.map((f) => (
                          <li key={f} className="rounded-md bg-soft px-2 py-0.5 text-xs font-medium text-ink-2">{f}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => setQrOrg(org.orgId)}>
                        <QrCode className="w-4 h-4" aria-hidden="true" /> QR code
                      </Button>
                      <Link
                        href={`/shop-dashboard?tab=applications&org=${encodeURIComponent(org.orgId)}`}
                        className={buttonClasses('ghost', 'sm')}
                      >
                        Applications
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {created && (
        <QrDialog
          open
          orgId={created.orgId}
          onClose={() => setCreated(null)}
          title={created.accountExisted ? 'Organization updated' : 'Organization created'}
        >
          <CredentialsBlock created={created} />
        </QrDialog>
      )}
      {qrOrg && <QrDialog open orgId={qrOrg} onClose={() => setQrOrg(null)} />}
    </div>
  );
}
