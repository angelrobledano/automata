import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const commerce = await prisma.commerce.create({
    data: {
      name: 'Pastelería La Auténtica',
      waPhoneNumberId: '1234567890',
      waToken: 'TEST_TOKEN',
      wooUrl: 'https://ejemplo.com',
      wooConsumerKey: 'ck_test',
      wooConsumerSecret: 'cs_test',
      systemPrompt: 'Eres un asistente amable de una pastelería. Solo puedes vender tartas de queso y de chocolate.',
    },
  });

  console.log('Seed completado. Comercio creado:', commerce.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
