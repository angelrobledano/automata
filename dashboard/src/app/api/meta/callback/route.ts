import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '../../../../../../src/integrations/meta/oauth';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Meta OAuth devolvió error:', url.searchParams.get('error_description'));
      return NextResponse.redirect(new URL('/ajustes?tab=canales&integration_error=true', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/ajustes?tab=canales&integration_error=missing_code', request.url));
    }

    // Decodificar el state para obtener el commerceId
    let commerceId = 'commerce-seed-id';
    try {
      const decodedState = Buffer.from(state, 'base64').toString('utf8');
      const parsed = JSON.parse(decodedState);
      if (parsed.commerceId) commerceId = parsed.commerceId;
    } catch (e) {
      console.error('Error decodificando state:', e);
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const hostOrigin = url.origin;
    const userId = 'SYSTEM_ADMIN';

    // Realizar el intercambio de tokens de forma segura
    await exchangeCodeForTokens(code, commerceId, userId, ip, hostOrigin);

    // Redirigir a la pestaña de canales en Ajustes indicando éxito
    return NextResponse.redirect(new URL('/ajustes?tab=canales&integration_success=meta', request.url));

  } catch (error: any) {
    console.error('Error in Meta OAuth callback:', error);
    return NextResponse.redirect(new URL(`/ajustes?tab=canales&integration_error=${encodeURIComponent(error.message || 'error')}`, request.url));
  }
}
