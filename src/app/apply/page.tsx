'use client';

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { Camera, CheckCircle2, Clock, ImagePlus, Lightbulb, Printer, ShieldCheck, SearchX } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { Alert, Button, Card, Eyebrow, LoadingState, SelectField, TextField } from '@/components/ui';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // what we accept from the device before resizing
const OUTPUT_WIDTH = 900; // final photo is at most 900×1125 (4:5 portrait), JPEG
const OUTPUT_HEIGHT = 1125;

type OrgState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'unknown' }
  | { kind: 'error' }
  | { kind: 'ready'; orgId: string; customFields: string[] };

/** Center-crops to 4:5 and resizes to a JPEG. Phone photos often exceed the 4 MB upload limit otherwise. */
async function preparePhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const targetRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (sw / sh > targetRatio) sw = sh * targetRatio;
    else sh = sw / targetRatio;
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;

    const scale = Math.min(1, OUTPUT_WIDTH / sw);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), 'image/jpeg', 0.88),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

const COARSE_POINTER = '(pointer: coarse)';
function subscribeCoarsePointer(onChange: () => void) {
  const mq = window.matchMedia(COARSE_POINTER);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
function isCoarsePointer() {
  return window.matchMedia(COARSE_POINTER).matches;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-soft flex flex-col">
      <header className="bg-white border-b border-line">
        <div className="mx-auto max-w-xl px-4 h-16 flex items-center justify-between">
          <BrandMark />
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-700">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Secure form
          </span>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-xl px-4 py-6 sm:py-10">{children}</main>
      <footer className="py-6 text-center text-[13px] text-muted">ID cards printed by ADL Digi House, Colombo</footer>
    </div>
  );
}

function ApplyForm() {
  const searchParams = useSearchParams();
  const orgParam = (searchParams.get('org') || '').trim();

  const [org, setOrg] = useState<OrgState>(orgParam ? { kind: 'loading' } : { kind: 'missing' });
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [reference, setReference] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const isTouch = useSyncExternalStore(subscribeCoarsePointer, isCoarsePointer, () => false);

  // Load the organization's form before showing it, so a bad link is caught immediately.
  useEffect(() => {
    if (!orgParam) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/organizations?orgId=${encodeURIComponent(orgParam)}`);
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        if (cancelled) return;
        if (!data.organization) {
          setOrg({ kind: 'unknown' });
        } else {
          const fields: string[] = Array.isArray(data.organization.customFields) ? data.organization.customFields : [];
          setOrg({ kind: 'ready', orgId: data.organization.orgId, customFields: fields });
          setCustomData(Object.fromEntries(fields.map((f) => [f, ''])));
        }
      } catch {
        if (!cancelled) setOrg({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgParam]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError('');
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose a photo (JPEG, PNG, WebP or HEIC).');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setPhotoError('That photo is too large. Please choose one under 25 MB.');
      return;
    }
    setProcessingPhoto(true);
    try {
      const blob = await preparePhoto(file);
      setPhoto(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setPhotoError('This photo couldn’t be opened on your device. Try a JPEG or PNG.');
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (org.kind !== 'ready') return;
    if (!photo) {
      setPhotoError('Please add a photo of yourself.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: photo,
      });
      const blob = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(blob.error || 'Your photo couldn’t be uploaded.');

      // The server assigns the application ID, timestamp and status.
      const appRes = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.orgId, name, role, bloodGroup, photoUrl: blob.url, customData }),
      });
      const data = await appRes.json().catch(() => ({}));
      if (!appRes.ok) throw new Error(data.error || 'Your application couldn’t be saved.');

      setReference(String(data.id || '').slice(0, 8).toUpperCase() || '—');
      window.scrollTo({ top: 0 });
    } catch (err) {
      // Everything typed stays in the form so the user can simply retry.
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForAnother = () => {
    setName('');
    setRole('');
    setBloodGroup('');
    setPhoto(null);
    setPreviewUrl(null);
    setCustomData((d) => Object.fromEntries(Object.keys(d).map((k) => [k, ''])));
    setReference(null);
  };

  /* ---------- Non-form states ---------- */

  if (org.kind === 'loading') return <LoadingState label="Opening your organization’s form…" />;

  if (org.kind !== 'ready') {
    const copy = {
      missing: { title: 'This link is incomplete', body: 'Scan the QR code your organization shared, or ask HR for the full application link.' },
      unknown: { title: 'We couldn’t find this organization', body: `No form is set up for “${orgParam}”. Check the link with your HR team, or scan the QR code again.` },
      error: { title: 'The form couldn’t load', body: 'Check your connection and reload this page.' },
    }[org.kind];
    return (
      <Card className="p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-soft text-muted flex items-center justify-center mb-4">
          <SearchX className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-ink">{copy.title}</h1>
        <p className="text-[15px] text-muted mt-2">{copy.body}</p>
        {org.kind === 'error' && (
          <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>Reload</Button>
        )}
      </Card>
    );
  }

  if (reference) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-status-ready-bg text-status-ready flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink">Application received</h1>
          <p className="text-[15px] text-muted mt-2">
            Thanks{name ? `, ${name.split(' ')[0]}` : ''}. Your ID card request for <strong className="text-ink">{org.orgId}</strong> is in.
          </p>
          <p className="mt-4 inline-block rounded-xl bg-soft px-4 py-2 text-sm text-muted">
            Reference <span className="font-mono font-bold text-ink">{reference}</span>
          </p>
        </div>
        <ol className="mt-8 space-y-3">
          {[
            { icon: Clock, title: 'Review', body: 'Your details are checked.' },
            { icon: Printer, title: 'Printing', body: 'ADL Digi House prints your card.' },
            { icon: CheckCircle2, title: 'Ready', body: 'Collect it from your HR or admin office.' },
          ].map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <Icon className="w-4 h-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-ink">{i + 1}. {title}</p>
                <p className="text-sm text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button variant="outline" className="w-full mt-6" onClick={resetForAnother}>
          Submit another application
        </Button>
      </Card>
    );
  }

  /* ---------- Form ---------- */

  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>{org.orgId}</Eyebrow>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-1.5">Apply for your staff ID card</h1>
        <p className="text-[15px] text-muted mt-1.5">Takes about two minutes. You’ll need a clear photo of your face.</p>
      </div>

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Alert tone="error" title="Not submitted yet">
              {error} Your answers are still here, so you can try again.
            </Alert>
          )}

          <TextField label="Full name" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} hint="As it should appear on your card." />
          <TextField label="Role or job title" required maxLength={100} autoComplete="organization-title" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Staff Nurse" />
          <SelectField label="Blood group" required value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
            <option value="">Select…</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </SelectField>

          {org.customFields.map((field) => (
            <TextField
              key={field}
              label={field}
              maxLength={200}
              value={customData[field] || ''}
              onChange={(e) => setCustomData((d) => ({ ...d, [field]: e.target.value }))}
            />
          ))}

          {/* Photo */}
          <fieldset>
            <legend className="block text-sm font-semibold text-ink-2 mb-1.5">
              Photo<span className="text-brand-600" aria-hidden="true"> *</span>
            </legend>
            <div className="flex gap-4 items-start">
              <div className="w-24 shrink-0 aspect-[4/5] rounded-xl border border-line bg-soft overflow-hidden flex items-center justify-center">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Your photo preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-7 h-7 text-line-strong" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                {isTouch && (
                  <Button type="button" variant="dark" size="sm" className="w-full" onClick={() => cameraRef.current?.click()} loading={processingPhoto}>
                    {!processingPhoto && <Camera className="w-4 h-4" aria-hidden="true" />} Take a photo
                  </Button>
                )}
                <Button
                  type="button"
                  variant={isTouch ? 'outline' : 'dark'}
                  size="sm"
                  className="w-full"
                  onClick={() => galleryRef.current?.click()}
                  loading={!isTouch && processingPhoto}
                  disabled={processingPhoto}
                >
                  {!(processingPhoto && !isTouch) && <ImagePlus className="w-4 h-4" aria-hidden="true" />}
                  {previewUrl ? 'Choose a different photo' : isTouch ? 'Choose from gallery' : 'Upload a photo'}
                </Button>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
                />
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
                />
              </div>
            </div>
            {photoError && <p className="text-[13px] text-status-rejected mt-2" role="alert">{photoError}</p>}
            <div className="mt-3 flex gap-2.5 rounded-xl bg-accent-50 p-3 text-[13px] text-accent-700">
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p>Face the camera against a plain, light background, with no sunglasses or hat. We crop it to ID-card shape automatically.</p>
            </div>
          </fieldset>

          <Button type="submit" loading={submitting} disabled={processingPhoto} className="w-full">
            {submitting ? 'Submitting…' : 'Submit application'}
          </Button>
          <p className="text-[13px] text-muted text-center">
            Your details are shared only with {org.orgId} and ADL Digi House to print your card.
          </p>
        </form>
      </Card>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <PageShell>
      <Suspense fallback={<LoadingState />}>
        <ApplyForm />
      </Suspense>
    </PageShell>
  );
}
