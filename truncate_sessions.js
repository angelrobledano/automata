const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Session" CASCADE;');
}
main().finally(() => prisma.$disconnect());
