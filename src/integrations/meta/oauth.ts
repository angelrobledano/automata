import { prisma } from '../../db/prisma';
import { encrypt } from '../../utils/crypto';

// Requisitos de la URL de Meta Login
const APP_ID = process.env.META_APP_ID!;
const APP_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_API_URL + '/api/meta/callback';

export function getMetaLoginUrl(commerceId: string) {
  const scopes = [
    'whatsapp_business_messaging',
    'whatsapp_business_management',
    'pages_manage_metadata',
    'pages_messaging'
  ];

  // state es crucial para asociar el callback con el tenant
  const state = JSON.stringify({ commerceId });
  const encodedState = Buffer.from(state).toString('base64');

  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${encodedState}&scope=${scopes.join(',')}&response_type=code`;
}

export async function exchangeCodeForTokens(code: string, commerceId: string, userId: string, ip: string) {
  // 1. Obtener Short-Lived User Access Token
  const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`;
  
  const tokenRes = await fetch(tokenUrl);
  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    throw new Error(`Error en OAuth: ${tokenData.error.message}`);
  }

  const shortLivedToken = tokenData.access_token;

  // 2. Intercambiar por Long-Lived Token
  const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
  const longLivedRes = await fetch(longLivedUrl);
  const longLivedData = await longLivedRes.json();
  
  const finalToken = longLivedData.access_token || shortLivedToken;

  // 3. Inspeccionar el token para obtener info del usuario
  const inspectUrl = `https://graph.facebook.com/debug_token?input_token=${finalToken}&access_token=${APP_ID}|${APP_SECRET}`;
  const inspectRes = await fetch(inspectUrl);
  const inspectData = await inspectRes.json();

  // 4. Guardar conexión
  const encryptedToken = encrypt(finalToken);
  const expiresAt = new Date(Date.now() + (longLivedData.expires_in || 5184000) * 1000);

  const connection = await prisma.channelConnection.create({
    data: {
      commerceId,
      provider: 'META',
      accessToken: encryptedToken,
      scopesGranted: JSON.stringify(inspectData.data.scopes),
      tokenType: 'USER_ACCESS_TOKEN',
      metaUserId: inspectData.data.user_id,
      metaAppId: inspectData.data.app_id,
      status: 'CONNECTED',
      tokenExpiresAt: expiresAt,
      lastValidatedAt: new Date()
    }
  });

  // 5. Auditar acción obligatoria
  await prisma.auditLog.create({
    data: {
      commerceId,
      userId,
      action: 'META_OAUTH_CONNECTED',
      targetId: connection.id,
      details: JSON.stringify({
        ip,
        scopes: inspectData.data.scopes,
        metaUserId: inspectData.data.user_id
      })
    }
  });

  return connection;
}
