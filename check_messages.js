const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany({ include: { messages: true } });
  console.log(JSON.stringify(sessions, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
