import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '../../../../../../src/integrations/meta/oauth';
import { cookies } from 'next/headers';
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

    // 1. Obtener commerceId desde la cookie JWT del usuario autenticado
    let commerceId = 'commerce-seed-id';
    let isEmbedded = false;

    try {
      const cookieStore = await cookies();
      const jwtToken = cookieStore.get('token')?.value;
      if (jwtToken) {
        const jwtPayload = await verifyToken(jwtToken);
        if (jwtPayload && jwtPayload.commerceId) {
          commerceId = jwtPayload.commerceId as string;
        }
      }
    } catch (e) {
      console.warn('No se pudo verificar cookie JWT en callback:', e);
    }

    // 2. Decodificar el state de Meta si viene
    if (state) {
      try {
        const decodedState = Buffer.from(state, 'base64').toString('utf8');
        const parsed = JSON.parse(decodedState);
        if (parsed.commerceId) commerceId = parsed.commerceId;
        if (parsed.embedded) isEmbedded = true;
      } catch (e) {
        console.warn('Error decodificando state:', e);
      }
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const hostOrigin = url.origin;
    const userId = 'SYSTEM_ADMIN';

    // 3. Realizar el intercambio de tokens de forma segura
    await exchangeCodeForTokens(code, commerceId, userId, ip, hostOrigin);

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
