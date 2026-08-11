import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'SUPERADMIN' && payload.role !== 'SUPPORT')) {
      return NextResponse.json({ error: 'Prohibido: Requiere rol de administración' }, { status: 403 });
    }

    if (payload.isImpersonating) {
      return NextResponse.json({ error: 'No permitido durante la impersonación' }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [
      totalCommerces,
      activeCommerces,
      suspendedCommerces,
      newSignups30d,
      totalUsers,
      activeUsers24h,
      totalMessages,
      totalSessions,
      failedIntegrations,
      avgLatencyAggregate,
      vipCommerces,
      activeSubscriptions,
      planDistribution
    ] = await Promise.all([
      prisma.commerce.count(),
      prisma.commerce.count({ where: { status: 'ACTIVE', onboardingCompleted: true } }),
      prisma.commerce.count({ where: { status: 'SUSPENDED' } }),
      prisma.commerce.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: twentyFourHoursAgo } } }),
      prisma.message.count(),
      prisma.session.count(),
      prisma.channelConnection.count({ where: { status: { in: ['FAILED', 'RECONNECT_REQUIRED', 'DISCONNECTED'] } } }),
      prisma.message.aggregate({
        _avg: { latencyMs: true },
        where: { latencyMs: { not: null } }
      }),
      prisma.commerce.count({ where: { isLifetimeFree: true } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.groupBy({
        by: ['planId'],
        _count: { _all: true },
        where: { status: 'ACTIVE' }
      })
    ]);

    // Estimación MRR (49€ plan estándar + valor estimado de VIPs)
    const basePlanPrice = 49;
    const estimatedMRR = (activeSubscriptions * basePlanPrice) + (vipCommerces * basePlanPrice);

    const avgLatencyMs = Math.round(avgLatencyAggregate._avg.latencyMs || 450);

    return NextResponse.json({
      success: true,
      metrics: {
        usage: {
          totalCommerces,
          activeCommerces,
          suspendedCommerces,
          newSignups30d,
          totalUsers,
          activeUsers24h
        },
        health: {
          totalMessages,
          totalSessions,
          failedIntegrations,
          avgLatencyMs,
          systemStatus: failedIntegrations === 0 ? 'Saludable' : 'Atención Requerida',
          queueStatus: 'Despejado'
        },
        business: {
          vipCommerces,
          activeSubscriptions,
          estimatedMRR,
          totalPlansCount: planDistribution.length
        }
      }
    });
  } catch (error: any) {
    console.error('Error admin metrics GET:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
