'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { authFetch, fetchMe } from '@/lib/apiClient';
import SaaSLayout from '@/components/SaaSLayout';
import { StatusDistributionChart } from '@/components/DashboardCharts';
import { 
  UserCheck, 
  Search, 
  Filter, 
  Clock, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  Building2 
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

export default function ClientDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const router = useRouter();

  async function fetchApplications() {
    try {
      // The server scopes this to the signed-in client's organization.
      const res = await authFetch('/api/applications');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      try {
        const me = await fetchMe();
        if (!me) {
          router.push('/login');
        } else if (me.role === 'shop') {
          router.push('/shop-dashboard');
        } else {
          setUserOrgId(me.orgId);
          fetchApplications();
        }
      } catch (err) {
        console.error('Failed to verify session:', err);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === '' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = applications.filter(a => a.status === 'Pending').length;
  const readyCount = applications.filter(a => a.status === 'Ready').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case 'Printing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-full">
            <Printer className="w-3 h-3" />
            <span>Printing</span>
          </span>
        );
      case 'Ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full">
            <XCircle className="w-3 h-3" />
            <span>{status || 'Rejected'}</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <SaaSLayout pageTitle="Client Portal">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-semibold">Loading Client Dashboard...</p>
        </div>
      </SaaSLayout>
    );
  }

  return (
    <SaaSLayout pageTitle={`Client Portal (${userOrgId})`}>
      <div className="space-y-6">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Submissions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{applications.length}</p>
              <span className="text-[11px] text-slate-400 font-medium mt-1 block">Org ID: {userOrgId}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
              <span className="text-[11px] text-slate-400 font-medium mt-1 block">Awaiting print shop action</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready Cards</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{readyCount}</p>
              <span className="text-[11px] text-slate-400 font-medium mt-1 block">Completed & ready for pickup</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Status Pipeline Chart */}
        <StatusDistributionChart applications={applications} />

        {/* Applications Data Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          {/* Header & Filter Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>{userOrgId} Employee Cards ({filteredApplications.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Isolated view from organization sheet tab</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-44 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600"
                />
              </div>

              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6">Blood Group</th>
                  <th className="py-3 px-6">Custom Details</th>
                  <th className="py-3 px-6 text-right">Card Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No applications found for organization tab ({userOrgId}).
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
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
                        {getStatusBadge(app.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredApplications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No applications found for organization tab ({userOrgId}).
              </div>
            ) : (
              filteredApplications.map((app) => (
                <div key={app.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Applied: {new Date(app.timestamp).toLocaleDateString()}
                    </span>
                    {getStatusBadge(app.status)}
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

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>Blood Group</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded border border-slate-200">
                      {app.bloodGroup}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SaaSLayout>
  );
}
