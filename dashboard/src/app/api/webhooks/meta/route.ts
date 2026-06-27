import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const backendUrl = `http://localhost:3001/api/webhooks/meta${url.search}`;
    
    const res = await fetch(backendUrl, {
      method: 'GET',
    });

    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  } catch (error) {
    console.error('Error proxying GET webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  console.log('[Next.js Webhook Proxy] Received POST request from Meta');
  try {
    const backendUrl = 'http://localhost:3001/api/webhooks/meta';
    const body = await req.text();
    console.log('[Next.js Webhook Proxy] Forwarding to backend:', backendUrl);

    const headers: Record<string, string> = {
      'Content-Type': req.headers.get('content-type') || 'application/json',
    };

    const signature = req.headers.get('x-hub-signature-256');
    if (signature) {
      headers['x-hub-signature-256'] = signature;
    }

    const res = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body,
    });

    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  } catch (error) {
    console.error('Error proxying POST webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
