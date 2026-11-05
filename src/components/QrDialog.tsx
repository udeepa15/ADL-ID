'use client';

import { useRef, useState, type ReactNode } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';
import { Button, ButtonLink, Dialog } from '@/components/ui';
import { applyUrl } from '@/lib/types';

const INK = '#16171c';

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** QR code for an organization's apply link, with copy, SVG and print-ready PNG downloads. */
export function QrPanel({ orgId }: { orgId: string }) {
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const url = applyUrl(orgId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the link is visible to copy by hand.
    }
  };

  const downloadSvg = () => {
    const svg = svgWrapRef.current?.querySelector('svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const href = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
    triggerDownload(href, `QR-${orgId}.svg`);
    URL.revokeObjectURL(href);
  };

  /** PNG poster: the QR code with "Scan to apply" and the org ID underneath, ready to print. */
  const downloadPng = () => {
    const qr = canvasWrapRef.current?.querySelector('canvas');
    if (!qr) return;
    const pad = 64;
    const textBlock = 150;
    const out = document.createElement('canvas');
    out.width = qr.width + pad * 2;
    out.height = qr.height + pad * 2 + textBlock;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(qr, pad, pad);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('Scan to apply for your ID card', out.width / 2, qr.height + pad + 70);
    ctx.fillStyle = '#c2006a';
    ctx.font = 'bold 44px ui-monospace, monospace';
    ctx.fillText(orgId, out.width / 2, qr.height + pad + 135);
    triggerDownload(out.toDataURL('image/png'), `QR-${orgId}.png`);
  };

  return (
    <div className="flex flex-col items-center">
      <div ref={svgWrapRef} className="rounded-2xl border border-line bg-white p-4">
        <QRCodeSVG value={url} size={184} fgColor={INK} level="M" title={`QR code for ${orgId} application form`} />
      </div>
      {/* Hidden high-resolution canvas used for the PNG download */}
      <div ref={canvasWrapRef} className="hidden" aria-hidden="true">
        <QRCodeCanvas value={url} size={1024} fgColor={INK} level="M" marginSize={2} />
      </div>

      <p className="mt-3 text-sm text-muted font-mono break-all text-center">{url}</p>

      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        <ButtonLink href={url} target="_blank" rel="noopener" variant="outline" size="sm">
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
          Open form
        </ButtonLink>
        <Button variant="dark" size="sm" onClick={downloadPng}>
          <Download className="w-4 h-4" aria-hidden="true" />
          PNG (print)
        </Button>
        <Button variant="outline" size="sm" onClick={downloadSvg}>
          <Download className="w-4 h-4" aria-hidden="true" />
          SVG
        </Button>
      </div>
    </div>
  );
}

export function QrDialog({
  orgId,
  open,
  onClose,
  children,
  title,
}: { orgId: string; open: boolean; onClose: () => void; children?: ReactNode; title?: string }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title ?? `Application QR code · ${orgId}`}
      description="Print or share this code. Staff scan it to open their organization's application form."
    >
      {children && <div className="mb-6">{children}</div>}
      <QrPanel orgId={orgId} />
    </Dialog>
  );
}
