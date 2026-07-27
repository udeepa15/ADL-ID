'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import SaaSLayout from '@/components/SaaSLayout';
import { ApplicationTrendChart, StatusDistributionChart } from '@/components/DashboardCharts';
import { 
  QrCode, 
  Download, 
  Search, 
  Filter, 
  CreditCard, 
  Plus, 
  Copy, 
  Check, 
  Key, 
  Mail, 
  Building2, 
  Sparkles, 
  X, 
  Clock, 
  Printer, 
  CheckCircle2, 
  TrendingUp, 
  Users 
} from 'lucide-react';

interface Application {
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

interface OrgConfig {
  orgId: string;
  clientEmail: string;
  customFields: string[];
  createdAt: string;
}

export default function ShopDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [organizations, setOrganizations] = useState<OrgConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOrg, setFilterOrg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Org Creation Form State
  const [newOrgId, setNewOrgId] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [fieldInput, setFieldInput] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgError, setOrgError] = useState('');

  // Generated Credentials Modal State
  const [createdModal, setCreatedModal] = useState<{
    orgId: string;
    clientEmail: string;
    generatedPassword: string;
    customFields: string[];
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function fetchData() {
    try {
      const [appsRes, orgsRes] = await Promise.all([
        fetch('/api/applications'),
        fetch('/api/organizations')
      ]);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData.applications || []);
      }

      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        setOrganizations(orgsData.organizations || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else if (!user.email?.includes('shopadmin')) {
        router.push('/client-dashboard');
      } else {
        fetchData();
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleAddCustomField = () => {
    const trimmed = fieldInput.trim();
    if (trimmed && !customFields.includes(trimmed)) {
      setCustomFields([...customFields, trimmed]);
      setFieldInput('');
    }
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgId.trim() || !newClientEmail.trim()) {
      setOrgError('Organization ID and Client Email are required.');
      return;
    }

    setCreatingOrg(true);
    setOrgError('');

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: newOrgId.trim(),
          clientEmail: newClientEmail.trim(),
          customFields,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      setCreatedModal({
        orgId: data.orgId,
        clientEmail: data.clientEmail,
        generatedPassword: data.generatedPassword,
        customFields: data.customFields || [],
      });

      setNewOrgId('');
      setNewClientEmail('');
      setCustomFields([]);

      fetchData();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error creating organization';
      setOrgError(msg);
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string, orgId: string) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, orgId }),
      });
      if (res.ok) {
        setApplications(apps => apps.map(app => 
          app.id === id ? { ...app, status: newStatus } : app
        ));
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const getQRUrl = (targetOrgId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/apply?org=${encodeURIComponent(targetOrgId)}`;
  };

  const downloadQR = (targetOrgId: string) => {
    const canvas = qrRef.current?.querySelector('svg');
    if (!canvas) return;
    const svgData = new XMLSerializer().serializeToString(canvas);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${targetOrgId}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyCredentials = () => {
    if (!createdModal) return;
    const text = `Organization ID: ${createdModal.orgId}\nClient Email: ${createdModal.clientEmail}\nPassword: ${createdModal.generatedPassword}\nApply Link: ${getQRUrl(createdModal.orgId)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredApplications = applications.filter(app => {
    const matchOrg = filterOrg === '' || app.orgId.toLowerCase().includes(filterOrg.toLowerCase());
    const matchStatus = filterStatus === '' || app.status === filterStatus;
    return matchOrg && matchStatus;
  });

  const pendingCount = applications.filter(a => a.status === 'Pending').length;
  const printingCount = applications.filter(a => a.status === 'Printing').length;
  const readyCount = applications.filter(a => a.status === 'Ready').length;

  if (loading) {
    return (
      <SaaSLayout pageTitle="Shop Admin Portal">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-semibold">Loading Admin Dashboard...</p>
        </div>
      </SaaSLayout>
    );
  }

  return (
    <SaaSLayout pageTitle="Shop Admin Portal">
      <div className="space-y-6">
        
        {/* Metric Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cards</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{applications.length}</p>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> +12% this week
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
              <span className="text-[11px] text-slate-400 font-medium mt-1 block">Awaiting print queue</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Printing</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{printingCount}</p>
              <span className="text-[11px] text-slate-400 font-medium mt-1 block">Active job production</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organizations</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{organizations.length}</p>
              <span className="text-[11px] text-slate-400 font-medium mt-1 block">Configured B2B clients</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ApplicationTrendChart applications={applications} />
          <StatusDistributionChart applications={applications} />
        </div>

        {/* Organization Creation & Custom Form Builder Panel */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create New Organization & Custom Fields</h2>
              <p className="text-xs text-slate-500">Creates an isolated Google Sheet tab, dynamic form fields, and client credentials</p>
            </div>
          </div>

          {orgError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {orgError}
            </div>
          )}

          <form onSubmit={handleCreateOrganization} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Organization ID *
                </label>
                <input 
                  type="text" 
                  required
                  value={newOrgId}
                  onChange={(e) => setNewOrgId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  placeholder="e.g. GH-2026 or CITY-HOSPITAL"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Client Admin Email *
                </label>
                <input 
                  type="email" 
                  required
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  placeholder="e.g. clientgh@example.com"
                />
              </div>
            </div>

            {/* Custom Form Fields Builder */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customize Application Form Fields (Optional)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Standard fields (Name, Role, Blood Group, Photo) are included automatically.</p>

              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={fieldInput}
                  onChange={(e) => setFieldInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomField(); } }}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600"
                  placeholder="e.g. Department, Employee ID, Emergency Contact"
                />
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Field</span>
                </button>
              </div>

              {customFields.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {customFields.map((field, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-blue-600 border border-slate-200 text-xs font-semibold rounded-full shadow-2xs">
                      <span>{field}</span>
                      <button type="button" onClick={() => handleRemoveCustomField(idx)} className="hover:text-red-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={creatingOrg}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creatingOrg ? (
                <span>Creating Organization...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Organization & Generate Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Configured Organizations List */}
        {organizations.length > 0 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Configured B2B Organizations ({organizations.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {organizations.map((org) => (
                <div key={org.orgId} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-600 text-xs">{org.orgId}</span>
                    <Link
                      href={`/apply?org=${encodeURIComponent(org.orgId)}`}
                      target="_blank"
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Application Link ↗
                    </Link>
                  </div>
                  <div className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{org.clientEmail}</span>
                  </div>
                  {org.customFields && org.customFields.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {org.customFields.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white text-slate-600 border border-slate-200 text-[10px] rounded font-medium">
                          +{f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Table Section */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          {/* Table Header Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Applications Data Grid ({filteredApplications.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Filter by Organization ID or Status</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Filter Org ID..."
                  value={filterOrg}
                  onChange={(e) => setFilterOrg(e.target.value)}
                  className="w-full sm:w-44 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600"
                />
              </div>

              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full sm:w-36 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-600"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Printing">Printing</option>
                  <option value="Ready">Ready</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Org ID</th>
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6">Blood Group</th>
                  <th className="py-3 px-6">Custom Details</th>
                  <th className="py-3 px-6 text-right">Fulfillment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No applications match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-blue-600">
                        {app.orgId}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="h-9 w-9 rounded-full object-cover border border-slate-200 bg-slate-100" src={app.photoUrl} alt="" />
                          <div>
                            <div className="font-semibold text-slate-900">{app.name}</div>
                            <div className="text-[10px] text-slate-400">{new Date(app.timestamp).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 font-medium">{app.role}</td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded border border-slate-200">
                          {app.bloodGroup}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        {app.customData && Object.keys(app.customData).length > 0 ? (
                          <div className="flex flex-col gap-0.5 text-[11px] text-slate-600">
                            {Object.entries(app.customData).map(([k, v]) => (
                              <span key={k}><strong className="text-slate-900">{k}:</strong> {v}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <select 
                          value={app.status}
                          onChange={(e) => handleStatusUpdate(app.id, e.target.value, app.orgId)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold outline-none border cursor-pointer transition-colors
                            ${app.status === 'Pending' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                              app.status === 'Printing' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                              app.status === 'Ready' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                              'bg-red-50 border-red-200 text-red-700'}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Printing">Printing</option>
                          <option value="Ready">Ready</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View Card List */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredApplications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No applications match your filter criteria.
              </div>
            ) : (
              filteredApplications.map((app) => (
                <div key={app.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-mono font-bold rounded">
                      {app.orgId}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(app.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="h-11 w-11 rounded-full object-cover border border-slate-200 bg-slate-100" src={app.photoUrl} alt="" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{app.name}</h3>
                      <p className="text-xs text-slate-500">{app.role}</p>
                    </div>
                  </div>

                  {app.customData && Object.keys(app.customData).length > 0 && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-1">
                      {Object.entries(app.customData).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[11px]">
                          <span className="text-slate-500">{k}:</span>
                          <span className="font-semibold text-slate-900">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">Blood: <strong className="text-slate-900">{app.bloodGroup}</strong></span>

                    <select 
                      value={app.status}
                      onChange={(e) => handleStatusUpdate(app.id, e.target.value, app.orgId)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold outline-none border cursor-pointer
                        ${app.status === 'Pending' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                          app.status === 'Printing' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                          app.status === 'Ready' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                          'bg-red-50 border-red-200 text-red-700'}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Printing">Printing</option>
                      <option value="Ready">Ready</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Generated Credentials Modal (Clerk Style) */}
      {createdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative">
            <button
              onClick={() => setCreatedModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Organization Setup Complete!</h3>
              <p className="text-xs text-slate-500">Google Sheet tab & Client Login account generated.</p>
            </div>

            {/* Credentials Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-blue-600" /> Org ID:</span>
                <span className="font-mono font-bold text-blue-600">{createdModal.orgId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> Client Email:</span>
                <span className="font-semibold text-slate-900">{createdModal.clientEmail}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-amber-500" /> Password:</span>
                <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">{createdModal.generatedPassword}</span>
              </div>
              
              <button
                onClick={copyCredentials}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2 mt-2 shadow-2xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copied ? 'Credentials Copied!' : 'Copy Account Info'}</span>
              </button>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div ref={qrRef} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <QRCodeSVG value={getQRUrl(createdModal.orgId)} size={150} />
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-2 mb-3 text-center break-all">{getQRUrl(createdModal.orgId)}</p>
              <button
                onClick={() => downloadQR(createdModal.orgId)}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download SVG QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SaaSLayout>
  );
}
