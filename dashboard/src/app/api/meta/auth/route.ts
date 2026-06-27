import { NextResponse } from 'next/server';
import { getMetaLoginUrl } from '../../../../../../src/integrations/meta/oauth';
// Asumiendo que guardamos el commerceId en una cookie
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return new NextResponse('Unauthorized', { status: 401 });

    const commerceId = payload.commerceId as string;

    const authUrl = getMetaLoginUrl(commerceId);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error starting Meta OAuth:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
