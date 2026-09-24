import { prisma } from '../../db/prisma';
import { encrypt } from '../../utils/crypto';
import crypto from 'crypto';

export function getMetaAppCredentials(hostOrigin?: string) {
  // B-10: fail-closed — sin secretos en env, la función lanza en lugar de usar
  // credenciales hardcodeadas (publicadas en el histórico del repo).
  const appId = process.env.META_APP_ID || process.env.META_CLIENT_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('META_APP_ID y META_APP_SECRET deben estar configurados en las variables de entorno');
  }

  let baseUrl = hostOrigin || process.env.NEXT_PUBLIC_API_URL || 'https://automata-pied.vercel.app';
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  const redirectUri = `${baseUrl}/api/meta/callback`;
  return { appId, appSecret, redirectUri };
}

/**
 * B-08: state de OAuth firmado con HMAC (JWT_SECRET). El callback verifica la
 * firma antes de aceptar el commerceId — antes era base64 plano y cualquiera
 * podía vincular una conexión Meta al comercio que quisiera (mis-binding).
 */
function signStateValue(value: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET debe estar configurado para firmar el state de OAuth');
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

export function buildSignedOAuthState(commerceId: string, userId: string, embedded = false): string {
  const payload = JSON.stringify({ commerceId, userId, embedded });
  const sig = signStateValue(payload);
  return Buffer.from(JSON.stringify({ commerceId, userId, embedded, sig })).toString('base64url');
}

export function verifySignedOAuthState(state: string): { commerceId: string; userId: string; embedded: boolean } | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    const { commerceId, userId, embedded, sig } = decoded;
    if (!commerceId || !userId || !sig) return null;
    const expected = signStateValue(JSON.stringify({ commerceId, userId, embedded: Boolean(embedded) }));
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { commerceId, userId, embedded: Boolean(embedded) };
  } catch {
    return null;
  }
}

export function getMetaLoginUrl(commerceId: string, hostOrigin?: string, userId: string = '') {
  const { appId, redirectUri } = getMetaAppCredentials(hostOrigin);

  const scopes = [
    'whatsapp_business_messaging',
    'whatsapp_business_management',
    'pages_manage_metadata',
    'pages_messaging'
  ];

  const encodedState = buildSignedOAuthState(commerceId, userId);

  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodedState}&scope=${scopes.join(',')}&response_type=code`;
}

export async function exchangeCodeForTokens(
  code: string, 
  commerceId: string, 
  userId: string, 
  ip: string,
  hostOrigin?: string
) {
  const { appId: APP_ID, appSecret: APP_SECRET, redirectUri: REDIRECT_URI } = getMetaAppCredentials(hostOrigin);

  // 1. Obtener Short-Lived User Access Token
  const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`;
  
  const tokenRes = await fetch(tokenUrl);
  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    throw new Error(`Error en OAuth Meta: ${tokenData.error.message}`);
  }

  const shortLivedToken = tokenData.access_token;

  // 2. Intercambiar por Long-Lived Token
  let finalToken = shortLivedToken;
  let expiresIn = 5184000; // 60 días por defecto

  try {
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();
    if (longLivedData.access_token) {
      finalToken = longLivedData.access_token;
      if (longLivedData.expires_in) expiresIn = longLivedData.expires_in;
    }
  } catch (e) {
    console.warn('[Meta OAuth] Fallback a token corto plazo:', e);
  }

  // 3. Inspeccionar el token para obtener info del usuario
  let metaUserId: string | null = null;
  let metaAppId: string | null = APP_ID;
  let scopesGranted: string = '[]';

  try {
    const inspectUrl = `https://graph.facebook.com/debug_token?input_token=${finalToken}&access_token=${APP_ID}|${APP_SECRET}`;
    const inspectRes = await fetch(inspectUrl);
    const inspectData = await inspectRes.json();
    if (inspectData.data) {
      metaUserId = inspectData.data.user_id || null;
      metaAppId = inspectData.data.app_id || APP_ID;
      if (inspectData.data.scopes) {
        scopesGranted = JSON.stringify(inspectData.data.scopes);
      }
    }
  } catch (e) {
    console.warn('[Meta OAuth] Error inspeccionando token:', e);
  }

  // 4. Limpiar conexiones previas y guardar nueva conexión activa
  const encryptedToken = encrypt(finalToken);
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await prisma.channelConnection.deleteMany({
    where: { commerceId, provider: 'META' }
  });

  const connection = await prisma.channelConnection.create({
    data: {
      commerceId,
      provider: 'META',
      accessToken: encryptedToken,
      scopesGranted,
      tokenType: 'USER_ACCESS_TOKEN',
      metaUserId,
      metaAppId,
      status: 'CONNECTED',
      tokenExpiresAt: expiresAt,
      lastValidatedAt: new Date()
    }
  });

  // 5. Auditoría
  try {
    await prisma.auditLog.create({
      data: {
        commerceId,
        userId: userId !== 'SYSTEM_ADMIN' ? userId : null,
        action: 'META_OAUTH_CONNECTED',
        targetId: connection.id,
        details: JSON.stringify({
          ip,
          scopes: scopesGranted,
          metaUserId
        })
      }
    });
  } catch (e) {
    console.warn('[Meta OAuth] No se pudo auditar:', e);
  }

  return connection;
}
