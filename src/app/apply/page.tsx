'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, CheckCircle2, ArrowLeft, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function ApplyForm() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org') || '';

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Dynamic Custom Fields State
  const [customFieldsSchema, setCustomFieldsSchema] = useState<string[]>([]);
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [fetchingSchema, setFetchingSchema] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Organization Custom Fields Schema
  useEffect(() => {
    if (!orgId) return;

    async function fetchOrgSchema() {
      setFetchingSchema(true);
      try {
        const res = await fetch(`/api/organizations?orgId=${encodeURIComponent(orgId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.organization && Array.isArray(data.organization.customFields)) {
            setCustomFieldsSchema(data.organization.customFields);
            const initialMap: Record<string, string> = {};
            data.organization.customFields.forEach((field: string) => {
              initialMap[field] = '';
            });
            setCustomData(initialMap);
          }
        }
      } catch (err) {
        console.error('Failed to fetch org schema:', err);
      } finally {
        setFetchingSchema(false);
      }
    }

    fetchOrgSchema();
  }, [orgId]);

  const handleCustomFieldChange = (field: string, value: string) => {
    setCustomData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      if (!ALLOWED_PHOTO_TYPES.includes(selectedFile.type)) {
        setError('Photo must be a JPEG, PNG or WebP image.');
        return;
      }
      if (selectedFile.size > MAX_PHOTO_BYTES) {
        setError('Photo must be 4 MB or smaller.');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setError('Organization ID is missing from the URL (e.g., ?org=GH-2026).');
      return;
    }
    if (!file) {
      setError('Please select a profile photo.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload photo to Blob API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      const blob = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(blob.error || 'Failed to upload photo to storage.');
      }

      // 2. Submit application record (the server assigns the ID, timestamp and status)
      const appResponse = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          name,
          role,
          bloodGroup,
          photoUrl: blob.url,
          customData,
        }),
      });

      if (!appResponse.ok) {
        const data = await appResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save application details.');
      }

      setSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 selection:bg-blue-600 selection:text-white">
        <div className="max-w-md w-full mx-auto my-auto bg-white border border-slate-200/80 rounded-3xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Your ID card application for <span className="font-semibold text-slate-900">{orgId}</span> has been received and added to your organization sheet tab.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setSuccess(false);
                setName('');
                setRole('');
                setBloodGroup('');
                setFile(null);
                setPreviewUrl(null);
                const resetData: Record<string, string> = {};
                customFieldsSchema.forEach(f => { resetData[f] = ''; });
                setCustomData(resetData);
              }}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
            >
              Submit Another Application
            </button>
            <Link
              href="/"
              className="block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all text-center"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <div className="max-w-xl mx-auto w-full mb-4">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Form Container */}
      <main className="max-w-xl w-full mx-auto bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">ID Card Application</h1>
              <p className="text-xs text-slate-500">Fill in your profile information</p>
            </div>
          </div>

          {orgId ? (
            <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-mono font-bold rounded-full">
              Org: {orgId}
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full">
              No Org Specified
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <span className="font-semibold">Error:</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Standard Fields */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              placeholder="e.g. Alex Morgan"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Role / Job Title *
            </label>
            <input 
              type="text" 
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              placeholder="e.g. Senior Software Engineer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Blood Group *
            </label>
            <select 
              required
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          {/* Dynamic Custom Fields */}
          {customFieldsSchema.length > 0 && (
            <div className="pt-2 pb-2 space-y-3.5 border-t border-b border-slate-100 my-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Organization Specific Fields</span>
              </div>

              {customFieldsSchema.map((fieldName) => (
                <div key={fieldName}>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {fieldName}
                  </label>
                  <input
                    type="text"
                    value={customData[fieldName] || ''}
                    onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                    placeholder={`Enter ${fieldName}`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Photo File Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Profile Photo *
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group"
            >
              {previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-xs" />
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {file?.name}
                  </span>
                  <span className="text-[11px] text-slate-400">Click to change photo</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-full bg-white text-slate-400 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200 flex items-center justify-center mb-2.5 transition-colors shadow-2xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    Click to select photo
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WEBP up to 4MB</span>
                </div>
              )}
              <input 
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Submitting Application...</span>
            ) : (
              <>
                <span>Submit Application</span>
                <ShieldCheck className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </main>

      <footer className="py-4 text-center text-xs text-slate-500">
        ADL ID Pass • Modern Light SaaS Application
      </footer>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading form...</div>}>
      <ApplyForm />
    </Suspense>
  );
}
