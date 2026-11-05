'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search, SearchX } from 'lucide-react';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  PhotoThumb,
  StatusBadge,
  StatusSelect,
  filterInputClass,
} from '@/components/ui';
import { STATUSES, formatDate, type Application, type Status } from '@/lib/types';

const PAGE_SIZE = 20;
type SortKey = 'newest' | 'oldest' | 'name';

interface ApplicationsTableProps {
  applications: Application[];
  /** When given, the table shows an Org column and an org filter (shop view). */
  orgOptions?: string[];
  initialOrg?: string;
  /** When given, status is editable and rows are selectable for bulk updates (shop view). */
  onStatusChange?: (app: Application, status: Status) => Promise<void>;
  /** Shown when there are no applications at all (not just none matching the filters). */
  emptyState: ReactNode;
}

/** Promise-based confirm dialog, used before rejecting applications. */
function useConfirm() {
  const [request, setRequest] = useState<{ message: string; resolve: (ok: boolean) => void } | null>(null);
  const confirm = (message: string) => new Promise<boolean>((resolve) => setRequest({ message, resolve }));
  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };
  const dialog = (
    <Dialog open={request !== null} onClose={() => close(false)} title="Reject application?" size="sm">
      <p className="text-[15px] text-ink-2">{request?.message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
        <Button variant="danger" onClick={() => close(true)}>Reject</Button>
      </div>
    </Dialog>
  );
  return { confirm, dialog };
}

function CustomDetails({ data }: { data?: Record<string, string> }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v);
  if (entries.length === 0) return <span className="text-muted">—</span>;
  return (
    <dl className="space-y-0.5 text-[13px]">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-1.5">
          <dt className="text-muted">{k}:</dt>
          <dd className="text-ink-2 font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ApplicationsTable({
  applications,
  orgOptions,
  initialOrg = '',
  onStatusChange,
  emptyState,
}: ApplicationsTableProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [org, setOrg] = useState(initialOrg);
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<Status>('Printing');
  const [bulkRunning, setBulkRunning] = useState(false);
  const { confirm, dialog } = useConfirm();
  const selectAllRef = useRef<HTMLInputElement>(null);

  const showOrg = Boolean(orgOptions);
  const editable = Boolean(onStatusChange);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = applications.filter((a) => {
      if (status && a.status !== status) return false;
      if (org && a.orgId.toLowerCase() !== org.toLowerCase()) return false;
      if (q && !a.name.toLowerCase().includes(q) && !a.role.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      const cmp = (a.timestamp || '').localeCompare(b.timestamp || '');
      return sort === 'newest' ? -cmp : cmp;
    });
  }, [applications, query, status, org, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const hasFilters = Boolean(query || status || org);

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  const clearFilters = () => {
    setQuery('');
    setStatus('');
    setOrg('');
    setPage(0);
  };

  const changeStatus = async (app: Application, next: Status) => {
    if (!onStatusChange) return;
    if (next === 'Rejected' && !(await confirm(`${app.name}'s application will be marked as rejected.`))) {
      throw new Error('cancelled');
    }
    await onStatusChange(app, next);
  };

  // Selection (only rows on the current page can be toggled with "select all")
  const pageIds = pageItems.map((a) => a.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));
  const indeterminate = someOnPageSelected && !allOnPageSelected;
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allOnPageSelected ? next.delete(id) : next.add(id)));
      return next;
    });

  const runBulk = async () => {
    if (!onStatusChange) return;
    const targets = applications.filter((a) => selected.has(a.id) && a.status !== bulkStatus);
    if (targets.length === 0) {
      setSelected(new Set());
      return;
    }
    if (bulkStatus === 'Rejected' && !(await confirm(`${targets.length} application(s) will be marked as rejected.`))) {
      return;
    }
    setBulkRunning(true);
    const failed = new Set<string>();
    // Sequential on purpose: each update reads the sheet, and Sheets has per-minute quotas.
    for (const app of targets) {
      try {
        await onStatusChange(app, bulkStatus);
      } catch {
        failed.add(app.id);
      }
    }
    setSelected(failed);
    setBulkRunning(false);
  };

  if (applications.length === 0) {
    return <Card>{emptyState}</Card>;
  }

  return (
    <Card className="overflow-hidden">
      {dialog}

      {/* Toolbar: filters in one row */}
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
          <label htmlFor="apps-search" className="sr-only">Search by name or role</label>
          <input
            id="apps-search"
            type="search"
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            placeholder="Search name or role"
            className={`${filterInputClass} w-full pl-9`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {showOrg && (
            <>
              <label htmlFor="apps-org" className="sr-only">Organization</label>
              <select id="apps-org" value={org} onChange={(e) => resetPage(setOrg)(e.target.value)} className={filterInputClass}>
                <option value="">All organizations</option>
                {orgOptions!.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </>
          )}
          <label htmlFor="apps-status" className="sr-only">Status</label>
          <select id="apps-status" value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} className={filterInputClass}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label htmlFor="apps-sort" className="sr-only">Sort</label>
          <select id="apps-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={filterInputClass}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {editable && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-50 px-4 py-3 sm:px-5" role="region" aria-label="Bulk actions">
          <p className="text-sm font-semibold text-brand-600">{selected.size} selected</p>
          <label htmlFor="bulk-status" className="sr-only">New status</label>
          <select id="bulk-status" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as Status)} className={filterInputClass}>
            {STATUSES.map((s) => <option key={s} value={s}>Set to {s}</option>)}
          </select>
          <Button size="sm" onClick={runBulk} loading={bulkRunning}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={bulkRunning}>Clear</Button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">{filtered.length} applications shown</p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No applications match these filters"
          action={hasFilters ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-soft/60 text-[13px] font-semibold text-muted">
                  {editable && (
                    <th scope="col" className="w-10 py-3 pl-5">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={togglePage}
                        aria-label="Select all on this page"
                        className="w-4 h-4 accent-brand"
                      />
                    </th>
                  )}
                  <th scope="col" className="py-3 px-5">Employee</th>
                  {showOrg && <th scope="col" className="py-3 px-5">Organization</th>}
                  <th scope="col" className="py-3 px-5">Blood</th>
                  <th scope="col" className="py-3 px-5">Details</th>
                  <th scope="col" className="py-3 px-5">Received</th>
                  <th scope="col" className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageItems.map((app) => (
                  <tr key={app.id} className={selected.has(app.id) ? 'bg-brand-50/50' : 'hover:bg-soft/60'}>
                    {editable && (
                      <td className="py-3 pl-5">
                        <input
                          type="checkbox"
                          checked={selected.has(app.id)}
                          onChange={() => toggle(app.id)}
                          aria-label={`Select ${app.name}`}
                          className="w-4 h-4 accent-brand"
                        />
                      </td>
                    )}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <PhotoThumb src={app.photoUrl} name={app.name} />
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate">{app.name}</p>
                          <p className="text-[13px] text-muted truncate">{app.role}</p>
                        </div>
                      </div>
                    </td>
                    {showOrg && <td className="py-3 px-5 font-mono text-[13px] font-semibold text-brand-600">{app.orgId}</td>}
                    <td className="py-3 px-5">
                      <span className="inline-block rounded-md border border-line px-2 py-0.5 text-[13px] font-semibold text-ink-2">{app.bloodGroup || '—'}</span>
                    </td>
                    <td className="py-3 px-5"><CustomDetails data={app.customData} /></td>
                    <td className="py-3 px-5 text-[13px] text-muted whitespace-nowrap">{formatDate(app.timestamp)}</td>
                    <td className="py-3 px-5 text-right">
                      {editable ? (
                        <StatusSelect value={app.status} onChange={(s) => changeStatus(app, s)} label={`Status for ${app.name}`} />
                      ) : (
                        <StatusBadge status={app.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-line">
            {pageItems.map((app) => (
              <li key={app.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {editable && (
                    <input
                      type="checkbox"
                      checked={selected.has(app.id)}
                      onChange={() => toggle(app.id)}
                      aria-label={`Select ${app.name}`}
                      className="mt-3 w-4 h-4 accent-brand"
                    />
                  )}
                  <PhotoThumb src={app.photoUrl} name={app.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{app.name}</p>
                    <p className="text-sm text-muted">{app.role}</p>
                    <p className="text-[13px] text-muted mt-0.5">
                      {showOrg && <span className="font-mono font-semibold text-brand-600">{app.orgId} · </span>}
                      {formatDate(app.timestamp)} · Blood {app.bloodGroup || '—'}
                    </p>
                  </div>
                </div>
                {Object.values(app.customData || {}).some(Boolean) && (
                  <div className="rounded-xl bg-soft p-3"><CustomDetails data={app.customData} /></div>
                )}
                <div>
                  {editable ? (
                    <StatusSelect value={app.status} onChange={(s) => changeStatus(app, s)} label={`Status for ${app.name}`} />
                  ) : (
                    <StatusBadge status={app.status} />
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5 text-sm text-muted">
            <p className="tabular-nums">
              {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-ink/5 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <span className="px-2 tabular-nums">Page {currentPage + 1} of {pageCount}</span>
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= pageCount - 1}
                  aria-label="Next page"
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-ink/5 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
