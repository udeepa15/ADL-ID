import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
  }

  try {
    const data = await request.arrayBuffer();

    let blob;
    try {
      blob = await put(filename, data, {
        access: 'public',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('private store') || errorMessage.includes('private access')) {
        blob = await put(filename, data, {
          access: 'private',
        });
      } else {
        throw err;
      }
    }

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error uploading to Blob:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
