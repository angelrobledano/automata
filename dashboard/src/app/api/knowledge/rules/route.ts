import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { RuleType, RuleScope } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const commerceId = payload.commerceId as string;

    const rules = await prisma.structuredKnowledgeRule.findMany({
      where: { commerceId },
      orderBy: { priority: 'desc' }
    });

    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const commerceId = payload.commerceId as string;
    const body = await req.json();

    const { name, type, priority, monthsOfYear, daysOfWeek, specificDate, isOverride, isClosed, payloadData } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Falta nombre o tipo de regla' }, { status: 400 });
    }

    const rule = await prisma.structuredKnowledgeRule.create({
      data: {
        commerceId,
        name,
        type: type as RuleType,
        scope: RuleScope.COMPANY,
        priority: priority || 100,
        monthsOfYear: monthsOfYear || [],
        daysOfWeek: daysOfWeek || [],
        specificDate: specificDate ? new Date(specificDate) : null,
        isOverride: isOverride ?? false,
        isClosed: isClosed ?? false,
        payload: payloadData || {}
      }
    });

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const commerceId = payload.commerceId as string;
    const url = new URL(req.url);
    const ruleId = url.searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ error: 'Falta el ID de la regla' }, { status: 400 });
    }

    await prisma.structuredKnowledgeRule.deleteMany({
      where: { id: ruleId, commerceId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
