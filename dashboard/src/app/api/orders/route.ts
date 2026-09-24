import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/db/prisma';
import { verifyToken } from '../../../lib/jwt';
import { readCookieValue } from '../../../../../src/utils/jwt';
import { OrderStatus, OrderSource, DeliveryType } from '@prisma/client';
import { decrypt } from '../../../../../src/utils/crypto';

export const dynamic = 'force-dynamic';

/**
 * B-06: el commerceId SOLO puede venir del JWT de sesión.
 * Eliminado el fallback a `prisma.commerce.findFirst()` (permitía a un anónimo
 * leer y escribir los pedidos del primer comercio de la BD).
 */
async function requireCommerceId(request: Request): Promise<string | null> {
  const token = readCookieValue(request.headers.get('cookie'), 'token');
  if (!token) return null;
  const payload = await verifyToken(token);
  return (payload?.commerceId as string) || null;
}

export async function GET(request: Request) {
  try {
    const commerceId = await requireCommerceId(request);
    if (!commerceId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    const sourceParam = url.searchParams.get('source');
    const searchParam = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const where: any = { commerceId };

    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam as OrderStatus;
    }

    if (sourceParam && sourceParam !== 'ALL') {
      where.source = sourceParam as OrderSource;
    }

    if (searchParam) {
      where.OR = [
        { externalOrderId: { contains: searchParam, mode: 'insensitive' } },
        { customerName: { contains: searchParam, mode: 'insensitive' } },
        { customerPhone: { contains: searchParam, mode: 'insensitive' } }
      ];
    }

    const [orders, allCommerceOrders] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      prisma.order.findMany({
        where: { commerceId },
        select: { status: true, totalAmount: true }
      })
    ]);

    const stats = {
      total: allCommerceOrders.length,
      pending: allCommerceOrders.filter(o => o.status === 'PENDING').length,
      preparing: allCommerceOrders.filter(o => o.status === 'PREPARING').length,
      ready: allCommerceOrders.filter(o => o.status === 'READY').length,
      delivered: allCommerceOrders.filter(o => o.status === 'DELIVERED').length,
      cancelled: allCommerceOrders.filter(o => o.status === 'CANCELLED').length,
      totalRevenue: allCommerceOrders
        .filter(o => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    };

    return NextResponse.json({ orders, stats });
  } catch (error: any) {
    console.error('[API /api/orders] Error fetching orders:', error);
    return NextResponse.json({ error: 'Error al recuperar los pedidos' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const commerceId = await requireCommerceId(request);
    if (!commerceId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'El ID del pedido es requerido' }, { status: 400 });
    }

    const existing = await prisma.order.findFirst({
      where: { id, commerceId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pedido no encontrado o no pertenece a tu comercio' }, { status: 404 });
    }

    const updateData: any = {};
    if (status && Object.values(OrderStatus).includes(status)) {
      updateData.status = status;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: updateData
    });

    // Notificación proactiva por WhatsApp si el estado ha cambiado a READY, DELIVERED o CANCELLED
    if (status && status !== existing.status && updated.customerPhone) {
      (async () => {
        try {
          const channelConn = await prisma.channelConnection.findFirst({
            where: {
              commerceId,
              provider: 'META',
              status: 'CONNECTED'
            }
          });

          if (channelConn && channelConn.channelPhoneId && channelConn.accessToken) {
            let notificationText = '';
            const orderRef = updated.externalOrderId ? `*${updated.externalOrderId}*` : 'tu encargo';
            const nameGreet = updated.customerName ? ` ${updated.customerName}` : '';

            if (status === 'READY') {
              notificationText = updated.deliveryType === 'DELIVERY'
                ? `¡Hola${nameGreet}! Tu pedido ${orderRef} ya está preparado y sale en breve para entrega a domicilio en ${updated.deliveryAddress || 'tu dirección'}. 🛵`
                : `¡Hola${nameGreet}! Tu pedido ${orderRef} ya está listo y empaquetado para que pases a recogerlo por nuestra tienda. ¡Te esperamos! 🛍️`;
            } else if (status === 'DELIVERED') {
              notificationText = `¡Hola${nameGreet}! Tu pedido ${orderRef} ha sido completado y entregado. ¡Muchas gracias por tu compra! ✨`;
            } else if (status === 'CANCELLED') {
              notificationText = `Hola${nameGreet}. Te informamos de que tu pedido ${orderRef} ha sido cancelado. Si tienes cualquier consulta o deseas reactivarlo, avísanos por aquí.`;
            }

            if (notificationText) {
              const decryptedToken = decrypt(channelConn.accessToken);
              const { WhatsAppService } = await import('@/services/whatsapp.service');
              await WhatsAppService.sendTextMessage(
                channelConn.channelPhoneId,
                updated.customerPhone,
                notificationText,
                decryptedToken
              );
            }
          }
        } catch (notifErr) {
          console.error('[API /api/orders] Error enviando notificación WhatsApp de pedido:', notifErr);
        }
      })().catch(() => {});
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    console.error('[API /api/orders] Error updating order:', error);
    return NextResponse.json({ error: 'Error al actualizar el pedido' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const commerceId = await requireCommerceId(request);
    if (!commerceId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      deliveryType = 'PICKUP',
      deliveryAddress,
      pickupTime,
      items = [],
      notes,
      totalAmount
    } = body;

    if (!customerPhone) {
      return NextResponse.json({ error: 'El teléfono del cliente es obligatorio' }, { status: 400 });
    }

    const now = new Date();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ENC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${randomSuffix}`;

    const newOrder = await prisma.order.create({
      data: {
        commerceId,
        externalOrderId: orderNumber,
        customerName: customerName || null,
        customerPhone,
        source: OrderSource.MANUAL,
        status: OrderStatus.PENDING,
        deliveryType: deliveryType === 'DELIVERY' ? DeliveryType.DELIVERY : DeliveryType.PICKUP,
        deliveryAddress: deliveryAddress || null,
        pickupTime: pickupTime || null,
        items: items,
        totalAmount: totalAmount ? parseFloat(totalAmount) : null,
        notes: notes || null
      }
    });

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error('[API /api/orders] Error creating order:', error);
    return NextResponse.json({ error: 'Error al registrar el pedido' }, { status: 500 });
  }
}
