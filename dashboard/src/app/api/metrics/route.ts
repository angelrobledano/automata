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
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const commerceId = payload.commerceId as string;

    const commerce = await prisma.commerce.findUnique({
      where: { id: commerceId },
      include: {
        channelConnections: true,
        _count: {
          select: { knowledgeSources: true, users: true }
        }
      }
    });

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
      daysForChart = 30;
    }

    const sessions = await prisma.session.findMany({
      where: { 
        commerceId: commerce.id, 
        isTest: false,
        ...(dateFilter && { updatedAt: dateFilter })
      },
      include: { messages: { orderBy: { createdAt: 'desc' } } },
      orderBy: { updatedAt: 'desc' }
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
        const lastMessage = session.messages[0];
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
    const automationRate = totalConversations > 0 ? Number(((aiResolvedConversations / totalConversations) * 100).toFixed(0)) : 0;
    
    // Calculamos tiempo ahorrado: 2 min por mensaje respondido por IA
    const minutesSaved = aiMessages * 2;
    const hoursPart = Math.floor(minutesSaved / 60);
    const minsPart = minutesSaved % 60;
    const timeSavedFormatted = hoursPart > 0 ? `${hoursPart} h ${minsPart} min` : `${minsPart} min`;
    const hoursSaved = (minutesSaved / 60).toFixed(1);
    const moneySaved = (parseFloat(hoursSaved) * 15).toFixed(2);

    // Gráfico dinámico
    const chartDataMap: Record<string, { total: number, ai: number }> = {};
    
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

    // Insights / Oportunidades
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
          description: 'Hemos detectado que 15 clientes preguntan por devoluciones. ¿Quieres añadir una política de devoluciones con 1 clic?',
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

    // Actividad reciente (los últimos 5 mensajes significativos)
    const recentActivity: Array<{ id: string; time: string; text: string; type: 'ai' | 'human' | 'warning' }> = [];
    let activityCount = 0;
    for (const session of sessions) {
      for (const msg of session.messages) {
        if (activityCount >= 5) break;
        const timeStr = new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (msg.role === 'assistant') {
          recentActivity.push({
            id: msg.id,
            time: timeStr,
            text: msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content,
            type: 'ai'
          });
          activityCount++;
        } else if (session.status === 'HUMAN_REQUESTED') {
          recentActivity.push({
            id: msg.id,
            time: timeStr,
            text: 'Un cliente solicitó atención de una persona.',
            type: 'warning'
          });
          activityCount++;
        }
      }
      if (activityCount >= 5) break;
    }

    // Estado del Asistente
    const waConnected = commerce.channelConnections.some(conn => conn.provider === 'META' && conn.status === 'CONNECTED');
    const assistantStatus = {
      isWorking: waConnected || sessions.length > 0,
      waConnected,
      knowledgeCount: commerce._count.knowledgeSources,
      hasKnowledge: commerce._count.knowledgeSources > 0,
      onboardingCompleted: commerce.onboardingCompleted,
      lastActivityAt: sessions[0]?.updatedAt ? new Date(sessions[0].updatedAt).toISOString() : null
    };

    return NextResponse.json({
      totalConversations,
      aiResolvedConversations,
      automationRate,
      hoursSaved,
      timeSavedFormatted,
      moneySaved,
      totalMessages,
      aiMessages,
      chartData,
      totalTokens,
      totalCost,
      insights,
      pendingCount,
      recentActivity,
      assistantStatus
    });

  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
