import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'test_token';

    if (mode && token) {
      if (mode === 'subscribe' && (token === VERIFY_TOKEN || !process.env.META_VERIFY_TOKEN)) {
        console.log('[Webhook Meta] Verificado correctamente por Next.js en Vercel!');
        return new NextResponse(challenge, { status: 200 });
      }
      console.warn(`[Webhook Meta] Token no coincide. Recibido: "${token}", Esperado: "${VERIFY_TOKEN}"`);
      return new NextResponse('Forbidden', { status: 403 });
    }

    return new NextResponse('Bad Request', { status: 400 });
  } catch (error) {
    console.error('Error procesando GET webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  console.log('[Next.js Webhook Proxy] Received POST request from Meta');
  try {
    const backendBase = process.env.BACKEND_URL || 'http://localhost:3001';
    const backendUrl = `${backendBase}/api/webhooks/meta`;
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
