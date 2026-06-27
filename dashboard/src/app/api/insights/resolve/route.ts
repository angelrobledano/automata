import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';

export async function POST(request: Request) {
  try {
    const { insightId, action } = await request.json();
    
    if (!insightId) {
      return NextResponse.json({ error: 'Insight ID is required' }, { status: 400 });
    }

    const insight = await prisma.insight.findUnique({ where: { id: insightId } });
    if (!insight) return NextResponse.json({ error: 'Insight not found' }, { status: 404 });

    // Si la acción es CREATE_KNOWLEDGE
    if (action === 'CREATE_KNOWLEDGE' && insight.actionData) {
      const data = typeof insight.actionData === 'string' ? JSON.parse(insight.actionData) : insight.actionData as any;
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/knowledge/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: data.title || insight.title, 
          text: data.content, 
          category: data.category || 'GENERAL' 
        })
      });
    }

    // Marcar como resuelto
    await prisma.insight.update({
      where: { id: insightId },
      data: { isResolved: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resolving insight:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
