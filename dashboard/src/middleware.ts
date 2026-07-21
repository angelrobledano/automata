import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

// Define rutas protegidas y públicas
const publicRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir activos estáticos, APIs y páginas públicas legales
  const publicPages = ['/', '/privacy', '/terms'];
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || publicPages.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  // Si no hay token y quiere acceder a algo protegido
  if (!token && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/register', request.url));
  }

  // Si hay token
  if (token) {
    const payload = await verifyToken(token);
    if (!payload) {
      // Token inválido
      request.cookies.delete('token');
      return NextResponse.redirect(new URL('/register', request.url));
    }

    // Proteger las rutas de Backoffice (God Mode)
    if (pathname.startsWith('/backoffice')) {
      if (payload.role !== 'SUPERADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Paywall (Stripe)
    if (pathname !== '/billing' && !publicPages.includes(pathname) && !pathname.startsWith('/onboarding') && !pathname.startsWith('/backoffice')) {
      if (!payload.isLifetimeFree && payload.subscriptionStatus !== 'ACTIVE') {
        return NextResponse.redirect(new URL('/billing', request.url));
      }
    }

    if (publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Proteger rutas si es AGENTE
    if (payload.role === 'AGENT') {
      const allowedAgentRoutes = ['/conversaciones', '/login', '/register'];
      const isAllowed = allowedAgentRoutes.some(r => pathname.startsWith(r)) || publicPages.includes(pathname);
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/conversaciones', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
