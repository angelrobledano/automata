import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../../lib/jwt';

export const dynamic = 'force-dynamic';

/**
 * Devuelve el JWT de sesión al cliente autenticado para el handshake de Socket.io.
 * La cookie es httpOnly (el JS no puede leerla), así que el cliente la obtiene
 * por aquí y la envía en `io(url, { auth: { token } })`.
 * Sin sesión válida → 401.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload?.commerceId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return NextResponse.json(
    { token },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
