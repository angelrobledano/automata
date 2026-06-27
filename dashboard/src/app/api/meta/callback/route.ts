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
      return NextResponse.redirect('/settings?integration_error=true');
    }

    if (!code || !state) {
      return new NextResponse('Missing code or state', { status: 400 });
    }

    // Decodificar el state para obtener el commerceId
    const decodedState = Buffer.from(state, 'base64').toString('utf8');
    const { commerceId } = JSON.parse(decodedState);

    // TODO: Obtener IP real del request headers
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // Asumimos un adminUserId o system para la auditoría (o extraido de sesión si estuviera disp.)
    const userId = 'SYSTEM_ADMIN';

    // Realizar el intercambio de tokens de forma segura
    await exchangeCodeForTokens(code, commerceId, userId, ip);

    // Redirigir al dashboard con éxito
    return NextResponse.redirect('/settings?integration_success=meta');

  } catch (error) {
    console.error('Error in Meta OAuth callback:', error);
    return NextResponse.redirect('/settings?integration_error=true');
  }
}
