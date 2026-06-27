const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.channelConnection.update({
    where: { id: '72bba8e7-4652-4919-9e75-29773d08d456' },
    data: { channelPhoneId: '1164451896760711' }
  });
  console.log('Updated DB successfully');
  await prisma.$disconnect();
}

main().catch(console.error);
