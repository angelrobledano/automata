// Audit: read-only counts against configured DATABASE_URL. No PII extraction.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function count(model) {
  try { return await prisma[model].count(); } catch (e) { return `ERR: ${e.message.slice(0, 80)}`; }
}

async function main() {
  const models = ['commerce', 'user', 'session', 'message', 'order', 'knowledgeSource', 'documentChunk', 'channelConnection', 'semanticCache', 'structuredKnowledgeRule', 'plan', 'subscription', 'responseAuditLog', 'auditLog', 'insight'];
  const out = {};
  for (const m of models) out[m] = await count(m);
  // commerce meta (no names)
  try {
    out.commerceMeta = await prisma.$queryRaw`SELECT
      count(*) FILTER (WHERE "subscriptionStatus" = 'ACTIVE') as active_subs,
      count(*) FILTER (WHERE "onboardingCompleted" = true) as onboarded,
      count(*) FILTER (WHERE "systemPrompt" IS NOT NULL AND "systemPrompt" <> '') as with_prompt,
      min("createdAt") as first_ever, max("createdAt") as last_ever
      FROM "Commerce"`;
  } catch (e) { out.commerceMeta = `ERR: ${e.message.slice(0, 100)}`; }
  // connections by provider/status
  try {
    out.connections = await prisma.channelConnection.groupBy({ by: ['provider', 'status'], _count: true });
  } catch (e) { out.connections = `ERR: ${e.message.slice(0, 100)}`; }
  // session status distribution
  try {
    out.sessionStatus = await prisma.session.groupBy({ by: ['status'], _count: true });
  } catch (e) { out.sessionStatus = `ERR: ${e.message.slice(0, 100)}`; }
  // message date range + role distribution
  try {
    out.messageMeta = await prisma.$queryRaw`SELECT count(*) FILTER (WHERE role='user') as user_msgs, count(*) FILTER (WHERE role='assistant') as ai_msgs, min("createdAt") as first_msg, max("createdAt") as last_msg FROM "Message"`;
  } catch (e) { out.messageMeta = `ERR: ${e.message.slice(0, 100)}`; }
  // orders
  try {
    out.orderMeta = await prisma.$queryRaw`SELECT count(*) as total, count(*) FILTER (WHERE source='MANUAL') as manual, count(*) FILTER (WHERE source='WOOCOMMERCE') as woo, count(*) FILTER (WHERE source='SHOPIFY') as shopify FROM "Order"`;
  } catch (e) { out.orderMeta = `ERR: ${e.message.slice(0, 100)}`; }
  // plans
  try {
    out.plans = await prisma.plan.findMany({ select: { name: true, monthlyPrice: true, status: true, providerPriceId: true } });
  } catch (e) { out.plans = `ERR: ${e.message.slice(0, 100)}`; }
  console.log(JSON.stringify(out, (_, v) => (typeof v === 'bigint' ? Number(v) : v), 2));
}

main().catch(e => { console.error('FATAL:', e.message.slice(0, 300)); process.exit(1); }).finally(() => prisma.$disconnect());
