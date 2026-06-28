import { Router } from 'express';
import express from 'express';
import { PaymentEngine } from './core/PaymentEngine';
import { prisma } from '../db/prisma';

const router = Router();
const engine = new PaymentEngine();

// --- WEBHOOK ENDPOINT ---
// We need raw body for Stripe signature validation
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).send('Missing signature');
  }

  try {
    const event = await engine.processWebhook(req.body, signature as string);
    
    // Idempotency check
    const isNew = await prisma.billingEvent.findUnique({ where: { providerEventId: event.eventId } });
    if (isNew) {
      console.log(`[Billing] Event ${event.eventId} already processed. Skipping.`);
      return res.status(200).send('Already processed');
    }

    // Process Business Logic based on event
    if (event.eventType === 'SUBSCRIPTION_CREATED' || event.eventType === 'SUBSCRIPTION_UPDATED') {
      const sub = event.rawPayload.data.object;
      if (event.commerceId) {
        // Sync subscription status to our DB
        await prisma.subscription.upsert({
          where: { commerceId: event.commerceId },
          update: {
             status: sub.status,
             currentPeriodStart: new Date(sub.current_period_start * 1000),
             currentPeriodEnd: new Date(sub.current_period_end * 1000),
             cancelAtPeriodEnd: sub.cancel_at_period_end
          },
          create: {
             commerceId: event.commerceId,
             planId: 'DYNAMIC_MAP', // En producción, mapearíamos sub.plan.id al UUID de nuestra DB
             status: sub.status,
             currentPeriodStart: new Date(sub.current_period_start * 1000),
             currentPeriodEnd: new Date(sub.current_period_end * 1000)
          }
        });
      }
    }

    // Log the event for audit
    await prisma.billingEvent.create({
      data: {
        providerEventId: event.eventId,
        provider: 'STRIPE',
        eventType: event.eventType || 'UNKNOWN',
        payload: event.rawPayload
      }
    });

    res.status(200).send('OK');
  } catch (err: any) {
    console.error(`[Billing Webhook Error]`, err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// --- ADMIN ENDPOINTS (Mocked auth for now) ---
router.get('/plans', async (req, res) => {
  const plans = await prisma.plan.findMany({ include: { features: true } });
  res.json(plans);
});

router.post('/plans', async (req, res) => {
  const data = req.body;
  const plan = await prisma.plan.create({
    data: {
      name: data.name,
      monthlyPrice: data.monthlyPrice,
      annualPrice: data.monthlyPrice * 10,
      providerPriceId: data.providerPriceId,
      features: {
        create: data.features || []
      }
    }
  });
  res.json(plan);
});

router.put('/plans/:id', async (req, res) => {
  const data = req.body;
  
  // Update plan
  await prisma.plan.update({
    where: { id: req.params.id },
    data: {
      name: data.name,
      monthlyPrice: data.monthlyPrice,
      providerPriceId: data.providerPriceId
    }
  });

  // Recreate features
  await prisma.planFeature.deleteMany({ where: { planId: req.params.id } });
  if (data.features && data.features.length > 0) {
    await prisma.planFeature.createMany({
      data: data.features.map((f: any) => ({ ...f, planId: req.params.id }))
    });
  }
  
  res.json({ success: true });
});

// --- CLIENT ENDPOINTS ---
router.get('/portal-data', async (req, res) => {
  const commerceId = req.headers['x-commerce-id'] as string; // Usually from Auth Middleware
  
  const plans = await prisma.plan.findMany({ where: { status: 'ACTIVE' }, include: { features: true } });
  const commerce = commerceId ? await prisma.commerce.findUnique({ 
    where: { id: commerceId },
    include: { subscriptions: true }
  }) : null;
  
  res.json({ plans, commerce });
});

router.post('/checkout', async (req, res) => {
  const commerceId = req.headers['x-commerce-id'] as string;
  const { planId, interval } = req.body;
  
  const commerce = await prisma.commerce.findUnique({ where: { id: commerceId } });
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  
  if (!commerce || !plan || !plan.providerPriceId) {
    return res.status(400).json({ error: 'Invalid plan or commerce' });
  }

  let customerId = commerce.billingCustomerId;
  if (!customerId) {
    const customer = await engine.provisionCustomer(commerce.id, 'admin@commerce.com', commerce.name);
    customerId = customer.id;
    await prisma.commerce.update({ where: { id: commerce.id }, data: { billingCustomerId: customerId } });
  }

  const session = await engine.createSubscriptionCheckout(
    customerId,
    plan.providerPriceId,
    `${process.env.DASHBOARD_URL}/ajustes/billing?success=true`,
    `${process.env.DASHBOARD_URL}/ajustes/billing?canceled=true`
  );

  res.json({ url: session.url });
});

router.put('/preferences', async (req, res) => {
  const commerceId = req.headers['x-commerce-id'] as string;
  const { overageBehavior } = req.body;
  
  await prisma.commerce.update({
    where: { id: commerceId },
    data: { overageBehavior }
  });
  
  res.json({ success: true });
});

export default router;
