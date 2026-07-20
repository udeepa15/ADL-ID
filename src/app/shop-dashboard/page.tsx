'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';

interface Application {
  id: string;
  orgId: string;
  timestamp: string;
  name: string;
  role: string;
  bloodGroup: string;
  photoUrl: string;
  status: string;
}

export default function ShopDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOrg, setFilterOrg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [qrOrgId, setQrOrgId] = useState('');
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  async function fetchApplications() {
    try {
      const res = await fetch(`/api/applications`);
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else if (!user.email?.includes('shopadmin')) {
        // Simple role check based on email string as per spec
        router.push('/client-dashboard');
      } else {
        fetchApplications();
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const generateQRUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/apply?org=${encodeURIComponent(qrOrgId)}`;
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('svg');
    if (!canvas) return;
    const svgData = new XMLSerializer().serializeToString(canvas);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${qrOrgId}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredApplications = applications.filter(app => {
    const matchOrg = filterOrg === '' || app.orgId.toLowerCase().includes(filterOrg.toLowerCase());
    const matchStatus = filterStatus === '' || app.status === filterStatus;
    return matchOrg && matchStatus;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-900">Loading shop dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Shop Admin Dashboard</h1>
          <button onClick={handleLogout} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Logout</button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* QR Code Generator Section */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Generate QR Code for Client</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
              <input 
                type="text" 
                value={qrOrgId}
                onChange={(e) => setQrOrgId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. GH-2026"
              />
            </div>
            <button 
              onClick={() => setShowQR(!!qrOrgId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Generate
            </button>
          </div>
          
          {showQR && qrOrgId && (
            <div className="mt-6 p-4 border border-gray-200 rounded-lg inline-flex flex-col items-center">
              <div ref={qrRef} className="bg-white p-2">
                <QRCodeSVG value={generateQRUrl()} size={200} />
              </div>
              <p className="text-sm text-gray-500 mt-2 mb-4 break-all max-w-xs text-center">{generateQRUrl()}</p>
              <button 
                onClick={downloadQR}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
              >
                Download SVG
              </button>
            </div>
          )}
        </div>

        {/* Filters and Table Section */}
        <div className="bg-white shadow sm:rounded-lg flex flex-col">
          <div className="p-4 border-b border-gray-200 flex gap-4 bg-gray-50">
            <input 
              type="text" 
              placeholder="Filter by Org ID..."
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
            />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Printing">Printing</option>
              <option value="Ready">Ready</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Org ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Group</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Update</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No applications found.</td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.orgId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className="h-10 w-10 rounded-full object-cover" src={app.photoUrl} alt="" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{app.name}</div>
                            <div className="text-sm text-gray-500">{new Date(app.timestamp).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.bloodGroup}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select 
                          value={app.status}
                          onChange={(e) => handleStatusUpdate(app.id, e.target.value)}
                          className={`px-3 py-1 border rounded-full text-xs font-semibold outline-none bg-white 
                            ${app.status === 'Pending' ? 'border-yellow-300 text-yellow-800' : 
                              app.status === 'Printing' ? 'border-blue-300 text-blue-800' : 
                              app.status === 'Ready' ? 'border-green-300 text-green-800' : 
                              'border-red-300 text-red-800'}`}
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
        </div>
      </main>
    </div>
  );
}
