const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const connections = await prisma.channelConnection.findMany();
  console.log(JSON.stringify(connections, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
