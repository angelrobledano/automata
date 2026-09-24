import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, verifySignedOAuthState } from '../../../../../../src/integrations/meta/oauth';
import { readCookieValue } from '../../../../../../src/utils/jwt';
import { verifyToken } from '@/lib/jwt';

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

    if (!code) {
      return NextResponse.redirect(new URL('/ajustes?tab=canales&integration_error=missing_code', request.url));
    }

    // 1. Identidad: state firmado (fuente de verdad) + cookie JWT como respaldo.
    let commerceId: string | null = null;
    let userId: string | null = null;
    let isEmbedded = false;

    if (state) {
      // B-08: el state DEBE estar firmado con HMAC. Un state no firmado se rechaza
      // (antes era base64 plano: mis-binding a cualquier commerceId).
      const verified = verifySignedOAuthState(state);
      if (!verified) {
        console.error('[Security] state de OAuth Meta no firmado o inválido — callback rechazado.');
        return NextResponse.redirect(new URL('/ajustes?tab=canales&integration_error=invalid_state', request.url));
      }
      commerceId = verified.commerceId;
      userId = verified.userId;
      isEmbedded = verified.embedded;
    }

    if (!commerceId) {
      // Compatibilidad: flujos sin state usan la cookie del propio navegador
      try {
        const jwtToken = readCookieValue(request.headers.get('cookie'), 'token');
        if (jwtToken) {
          const jwtPayload = await verifyToken(jwtToken);
          if (jwtPayload?.commerceId) {
            commerceId = jwtPayload.commerceId as string;
            userId = (jwtPayload.userId as string) || null;
          }
        }
      } catch (e) {
        console.warn('No se pudo verificar cookie JWT en callback:', e);
      }
    }

    if (!commerceId) {
      return NextResponse.redirect(new URL('/ajustes?tab=canales&integration_error=no_identity', request.url));
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const hostOrigin = url.origin;

    // 2. Realizar el intercambio de tokens de forma segura
    await exchangeCodeForTokens(code, commerceId, userId || 'unknown', ip, hostOrigin);

    // 4. Si el flujo fue modal/embedded, cerrar el popup y recargar la ventana principal
    if (isEmbedded) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head><title>Conexión completada</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.location.href = '/ajustes?tab=canales&integration_success=meta';
              }
              window.close();
            </script>
            <p>Conexión completada con éxito. Puedes cerrar esta ventana.</p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Redirigir a la pestaña de canales en Ajustes indicando éxito
    return NextResponse.redirect(new URL('/ajustes?tab=canales&integration_success=meta', request.url));

  } catch (error: any) {
    console.error('Error in Meta OAuth callback:', error);
    return NextResponse.redirect(new URL(`/ajustes?tab=canales&integration_error=${encodeURIComponent(error.message || 'error')}`, request.url));
  }
}
