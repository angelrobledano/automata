import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/db/prisma';

import { cookies } from 'next/headers';
import { verifyToken } from '../../../lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '7d';

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    let commerceId = 'commerce-seed-id';

    if (token) {
      const payload = await verifyToken(token);
      if (payload && payload.commerceId) {
        commerceId = payload.commerceId as string;
      }
    }

    const commerce = await prisma.commerce.findUnique({ where: { id: commerceId } });
    if (!commerce) return NextResponse.json({ error: 'No commerce found' }, { status: 404 });

    let dateFilter: any = undefined;
    const now = new Date();
    let daysForChart = 7;

    if (period === 'today') {
      const today = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { gte: today };
      daysForChart = 1;
    } else if (period === '7d') {
      const last7 = new Date();
      last7.setDate(last7.getDate() - 7);
      dateFilter = { gte: last7 };
      daysForChart = 7;
    } else if (period === '30d') {
      const last30 = new Date();
      last30.setDate(last30.getDate() - 30);
      dateFilter = { gte: last30 };
      daysForChart = 30;
    } else if (period === 'all') {
      daysForChart = 30; // Max 30 points for the chart to not overflow
    }

    const sessions = await prisma.session.findMany({
      where: { 
        commerceId: commerce.id, 
        isTest: false,
        ...(dateFilter && { updatedAt: dateFilter })
      },
      include: { messages: true }
    });

    let totalMessages = 0;
    let aiMessages = 0;
    let humanSessions = 0;
    let pendingCount = 0;
    let totalTokens = 0;
    let totalCost = 0;

    sessions.forEach(session => {
      if (session.status === 'HUMAN_REQUESTED' || session.status === 'HUMAN_CONTROL') {
        humanSessions++;
      }

      if (session.status === 'HUMAN_REQUESTED') {
        pendingCount++;
      } else if (session.status === 'HUMAN_CONTROL') {
        const lastMessage = session.messages[session.messages.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
          pendingCount++;
        }
      }

      session.messages.forEach(msg => {
        if (dateFilter && msg.createdAt < dateFilter.gte) return;
        totalMessages++;
        if (msg.role === 'assistant') {
          aiMessages++;
          if (msg.tokensUsed) totalTokens += msg.tokensUsed;
          if (msg.estimatedCost) totalCost += msg.estimatedCost;
        }
      });
    });

    const totalConversations = sessions.length;
    const aiResolvedConversations = totalConversations - humanSessions;
    const automationRate = totalConversations > 0 ? ((aiResolvedConversations / totalConversations) * 100).toFixed(1) : 0;
    
    // Calculamos horas recuperadas: 2 min (120 seg) ahorrados por cada mensaje que responde la IA
    const minutesSaved = aiMessages * 2;
    const hoursSaved = (minutesSaved / 60).toFixed(1);

    // Calculamos coste evitado: 15€/h * horas ahorradas
    const moneySaved = (parseFloat(hoursSaved) * 15).toFixed(2);

    // Gráfico dinámico
    const chartDataMap: Record<string, { total: number, ai: number }> = {};
    
    // Rellenamos el mapa con 0
    for (let i = daysForChart - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      chartDataMap[dateStr] = { total: 0, ai: 0 };
    }

    sessions.forEach(session => {
      session.messages.forEach(msg => {
        const dateStr = new Date(msg.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        if (chartDataMap[dateStr] !== undefined) {
          chartDataMap[dateStr].total++;
          if (msg.role === 'assistant') chartDataMap[dateStr].ai++;
        }
      });
    });

    const chartData = Object.entries(chartDataMap).map(([date, data]) => ({
      date,
      total: data.total,
      ai: data.ai
    }));

    let insights = await prisma.insight.findMany({
      where: { commerceId: commerce.id, isResolved: false },
      orderBy: { createdAt: 'desc' }
    });

    if (insights.length === 0) {
      const mockInsight = await prisma.insight.create({
        data: {
          commerceId: commerce.id,
          type: 'MISSING_KNOWLEDGE',
          title: 'Preguntas frecuentes sobre Devoluciones',
          description: 'Hemos detectado que 15 clientes preguntan por devoluciones. ¿Quieres añadir una política de devoluciones al Cerebro con 1 clic?',
          actionLabel: 'Añadir política',
          actionData: {
            title: 'Política de Devoluciones (Generada)',
            content: 'Nuestra política de devoluciones es de 30 días. Los artículos deben estar sin usar y en su embalaje original. Para iniciar una devolución, envíe un correo a soporte.',
            category: 'POLICIES'
          }
        }
      });
      insights = [mockInsight];
    }

    return NextResponse.json({
      totalConversations,
      aiResolvedConversations,
      automationRate,
      hoursSaved,
      moneySaved,
      totalMessages,
      aiMessages,
      chartData,
      totalTokens,
      totalCost,
      insights,
      pendingCount
    });

  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
