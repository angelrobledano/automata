import { prisma } from '../db/prisma';
import { decrypt } from '../utils/crypto';

export async function checkMetaConnectionHealth() {
  console.log('[HealthCheck] Iniciando validación de conexiones de Meta...');

  const connections = await prisma.channelConnection.findMany({
    where: { provider: 'META', status: 'CONNECTED' }
  });

  for (const conn of connections) {
    try {
      if (!conn.accessToken) continue;
      
      const token = decrypt(conn.accessToken); // Asumimos que decrypt maneja si no está encriptado todavía por seguridad
      
      // Llamada a la Graph API para debuguear el token
      // Para debug_token necesitamos un App Access Token o el mismo token de usuario si tiene permisos.
      // Aquí usaremos la info básica de "me" para validar si el token sigue vivo.
      const response = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // El token expiró o fue revocado
        await prisma.channelConnection.update({
          where: { id: conn.id },
          data: { 
            status: 'FAILED', 
            lastErrorReason: errorData.error?.message || 'Token revocado o expirado'
          }
        });

        // Registrar auditoría del fallo
        await prisma.auditLog.create({
          data: {
            commerceId: conn.commerceId,
            userId: 'SYSTEM',
            action: 'CONNECTION_HEALTH_FAILED',
            targetId: conn.id,
            details: JSON.stringify({ error: errorData.error })
          }
        });

        console.warn(`[HealthCheck] Conexión ${conn.id} (Comercio ${conn.commerceId}) marcada como ERROR.`);
      } else {
        // Todo OK, actualizamos lastValidatedAt
        await prisma.channelConnection.update({
          where: { id: conn.id },
          data: { lastValidatedAt: new Date() }
        });
      }
    } catch (error: any) {
      console.error(`[HealthCheck] Error inesperado verificando conexión ${conn.id}:`, error.message);
    }
  }

  console.log('[HealthCheck] Validación completada.');
}
