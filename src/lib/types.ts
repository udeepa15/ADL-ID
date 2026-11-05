export const STATUSES = ['Pending', 'Printing', 'Ready', 'Rejected'] as const;
export type Status = (typeof STATUSES)[number];

export interface Application {
  id: string;
  orgId: string;
  timestamp: string;
  name: string;
  role: string;
  bloodGroup: string;
  photoUrl: string;
  status: string;
  customData?: Record<string, string>;
}

export interface OrgConfig {
  orgId: string;
  clientEmail: string;
  customFields: string[];
  createdAt: string;
}

/** Mirrors the server's org ID rule in src/lib/googleSheets.ts. */
export const ORG_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/;

export function applyUrl(orgId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/apply?org=${encodeURIComponent(orgId)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function sortNewestFirst(apps: Application[]): Application[] {
  return [...apps].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}
