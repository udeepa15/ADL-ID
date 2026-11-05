import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel functions reject request bodies over 4.5 MB)

const ALLOWED_TYPES: Record<string, { ext: string; matches: (b: Uint8Array) => boolean }> = {
  'image/jpeg': { ext: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': {
    ext: 'png',
    matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  'image/webp': {
    ext: 'webp',
    matches: (b) =>
      String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' &&
      String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP',
  },
};

/**
 * Public endpoint used by the apply form. Accepts a single JPEG/PNG/WebP image up to 4 MB
 * as the raw request body. The stored filename is generated server-side.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const allowed = ALLOWED_TYPES[contentType];
  if (!allowed) {
    return NextResponse.json({ error: 'Photo must be a JPEG, PNG or WebP image' }, { status: 415 });
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Photo must be 4 MB or smaller' }, { status: 413 });
  }

  if (!request.body) {
    return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
  }

  try {
    const data = new Uint8Array(await request.arrayBuffer());

    if (data.byteLength === 0) {
      return NextResponse.json({ error: 'Photo is empty' }, { status: 400 });
    }
    if (data.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Photo must be 4 MB or smaller' }, { status: 413 });
    }
    if (!allowed.matches(data)) {
      return NextResponse.json({ error: 'File content does not match its image type' }, { status: 415 });
    }

    const pathname = `photos/${crypto.randomUUID()}.${allowed.ext}`;
    const options = { contentType, addRandomSuffix: false } as const;

    let blob;
    try {
      blob = await put(pathname, Buffer.from(data), { ...options, access: 'public' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('private store') || errorMessage.includes('private access')) {
        blob = await put(pathname, Buffer.from(data), { ...options, access: 'private' });
      } else {
        throw err;
      }
    }

    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    console.error('Error uploading to Blob:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
