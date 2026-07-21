import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.documentChunk.deleteMany();
  await prisma.knowledgeSource.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.commerce.deleteMany();

  // Create Commerce
  const commerce = await prisma.commerce.create({
    data: {
      id: 'commerce-seed-id',
      name: 'Mi Tienda Online (Producción)',
      systemPrompt: 'Eres un IA amable. Atiendes clientes de Mi Tienda Online. Eres resolutivo y experto.',
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.7,
      aiMaxTokens: 500,
      onboardingCompleted: true,
      subscriptionStatus: 'ACTIVE'
    }
  });

  // Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  await prisma.user.create({
    data: {
      commerceId: commerce.id,
      email: 'owner@tienda.com',
      password: hashedPassword,
      role: 'OWNER'
    }
  });

  await prisma.user.create({
    data: {
      commerceId: commerce.id,
      email: 'agente@tienda.com',
      password: hashedPassword,
      role: 'AGENT'
    }
  });

  // Create SUPERADMIN User
  await prisma.user.create({
    data: {
      commerceId: commerce.id,
      email: 'superadmin@automata.com',
      password: hashedPassword,
      role: 'SUPERADMIN'
    }
  });

  // Create another fictitious company
  const commerceFicticia = await prisma.commerce.create({
    data: {
      id: 'commerce-ficticia-id',
      name: 'Acme Corp Ficticia',
      systemPrompt: 'Eres el asistente de Acme Corp.',
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.7,
      aiMaxTokens: 500,
      onboardingCompleted: true,
      subscriptionStatus: 'ACTIVE',
      isLifetimeFree: false
    }
  });

  await prisma.user.create({
    data: {
      commerceId: commerceFicticia.id,
      email: 'owner@acmecorp.demo',
      password: hashedPassword,
      role: 'OWNER'
    }
  });

  // Create a Channel Connection for the commerce
  const channelConn = await prisma.channelConnection.create({
    data: {
      commerceId: commerce.id,
      provider: 'META',
      channelAccountId: 'acc_seed_123',
      channelPhoneId: '+34600000000',
      status: 'CONNECTED'
    }
  });

  // Create some initial real-looking sessions
  const session1 = await prisma.session.create({
    data: {
      commerceId: commerce.id,
      channelConnectionId: channelConn.id,
      customerIdentifier: '+34600000001',
      status: 'HUMAN_REQUESTED',
      isTest: false,
    }
  });

  await prisma.message.createMany({
    data: [
      { sessionId: session1.id, role: 'user', content: 'Hola, mi pedido no ha llegado.' },
      { sessionId: session1.id, role: 'assistant', content: 'Hola, lo reviso ahora mismo. Dame un segundo.', tokensUsed: 15, latencyMs: 400 },
      { sessionId: session1.id, role: 'user', content: 'Quiero hablar con un humano.' }
    ]
  });

  const session2 = await prisma.session.create({
    data: {
      commerceId: commerce.id,
      channelConnectionId: channelConn.id,
      customerIdentifier: '+34600000002',
      status: 'ACTIVE',
      isTest: false,
    }
  });

  await prisma.message.createMany({
    data: [
      { sessionId: session2.id, role: 'user', content: '¿A qué hora cerráis?' },
      { sessionId: session2.id, role: 'assistant', content: 'Cerramos a las 20:00 todos los días laborables.', tokensUsed: 22, latencyMs: 650 }
    ]
  });

  // Create a Knowledge Source
  await prisma.knowledgeSource.create({
    data: {
      commerceId: commerce.id,
      name: 'Horarios de apertura',
      type: 'TEXT',
      content: 'Abrimos de 9:00 a 20:00 de Lunes a Viernes.'
    }
  });

  console.log('Creando sesiones demo para Acme Corp...');
  
  const acmeChannelConn = await prisma.channelConnection.create({
    data: {
      commerceId: commerceFicticia.id,
      provider: 'META',
      channelAccountId: 'acc_acme_123',
      channelPhoneId: '+34600111000',
      status: 'CONNECTED'
    }
  });

  // 1. ACTIVE: AI handling tracking
  const acmeSession1 = await prisma.session.create({
    data: {
      commerceId: commerceFicticia.id,
      channelConnectionId: acmeChannelConn.id,
      customerIdentifier: '+34600111222',
      status: 'ACTIVE',
      isTest: false,
    }
  });
  await prisma.message.createMany({
    data: [
      { sessionId: acmeSession1.id, role: 'user', content: 'Hola, ¿dónde está mi pedido #1044?' },
      { sessionId: acmeSession1.id, role: 'assistant', content: 'Hola. He revisado el estado de tu pedido #1044 y actualmente se encuentra "En reparto". Deberías recibirlo hoy antes de las 19:00.', tokensUsed: 45, latencyMs: 800 }
    ]
  });

  // 2. ACTIVE: AI answering specs
  const acmeSession2 = await prisma.session.create({
    data: {
      commerceId: commerceFicticia.id,
      channelConnectionId: acmeChannelConn.id,
      customerIdentifier: '+34700222333',
      status: 'ACTIVE',
      isTest: false,
    }
  });
  await prisma.message.createMany({
    data: [
      { sessionId: acmeSession2.id, role: 'user', content: '¿El modelo X200 tiene conectividad Bluetooth?' },
      { sessionId: acmeSession2.id, role: 'assistant', content: 'Sí, el modelo X200 cuenta con Bluetooth 5.2 de baja latencia.', tokensUsed: 20, latencyMs: 500 },
      { sessionId: acmeSession2.id, role: 'user', content: 'Genial, ¿y batería?' },
      { sessionId: acmeSession2.id, role: 'assistant', content: 'La batería dura aproximadamente 24 horas de reproducción continua.', tokensUsed: 18, latencyMs: 450 }
    ]
  });

  // 3. HUMAN_REQUESTED: Angry customer
  const acmeSession3 = await prisma.session.create({
    data: {
      commerceId: commerceFicticia.id,
      channelConnectionId: acmeChannelConn.id,
      customerIdentifier: '+34600999888',
      status: 'HUMAN_REQUESTED',
      isTest: false,
    }
  });
  await prisma.message.createMany({
    data: [
      { sessionId: acmeSession3.id, role: 'user', content: 'Me ha llegado el paquete roto. Es la segunda vez que pasa.' },
      { sessionId: acmeSession3.id, role: 'assistant', content: 'Siento mucho las molestias. ¿Podrías enviarme una foto del producto dañado para tramitar la incidencia?', tokensUsed: 35, latencyMs: 600 },
      { sessionId: acmeSession3.id, role: 'user', content: 'No quiero hablar con un bot, pasame con una persona YA.' }
    ]
  });

  // 4. HUMAN_CONTROL: Human replied, waiting for customer
  const acmeSession4 = await prisma.session.create({
    data: {
      commerceId: commerceFicticia.id,
      channelConnectionId: acmeChannelConn.id,
      customerIdentifier: '+34600555444',
      status: 'HUMAN_CONTROL',
      isTest: false,
    }
  });
  await prisma.message.createMany({
    data: [
      { sessionId: acmeSession4.id, role: 'user', content: 'Necesito cambiar la dirección de envío del pedido urgente.' },
      { sessionId: acmeSession4.id, role: 'assistant', content: 'Voy a transferirte con un agente humano para que pueda gestionar el cambio de dirección antes de que salga el paquete.', tokensUsed: 30, latencyMs: 700 },
      { sessionId: acmeSession4.id, role: 'assistant', content: 'Hola, soy Carlos del equipo de soporte. ¿A qué nueva dirección quieres enviarlo?' }
    ]
  });

  // 5. CLOSED: AI fully resolved a return
  const acmeSession5 = await prisma.session.create({
    data: {
      commerceId: commerceFicticia.id,
      channelConnectionId: acmeChannelConn.id,
      customerIdentifier: '+34600123123',
      status: 'CLOSED',
      isTest: false,
    }
  });
  await prisma.message.createMany({
    data: [
      { sessionId: acmeSession5.id, role: 'user', content: 'Quiero devolver unas zapatillas que me quedan pequeñas.' },
      { sessionId: acmeSession5.id, role: 'assistant', content: 'Claro, puedes iniciar la devolución en nuestro portal acmecorp.demo/devoluciones introduciendo tu número de pedido. Tienes 30 días gratuitos.', tokensUsed: 40, latencyMs: 550 },
      { sessionId: acmeSession5.id, role: 'user', content: 'Perfecto, ya lo he hecho. Gracias.' },
      { sessionId: acmeSession5.id, role: 'assistant', content: '¡Genial! Recibirás el reembolso en cuanto nos llegue el paquete. ¿Te puedo ayudar con algo más?', tokensUsed: 25, latencyMs: 400 },
      { sessionId: acmeSession5.id, role: 'user', content: 'No, eso es todo.' }
    ]
  });

  // 6. CLOSED: Human stepped in and resolved
  const acmeSession6 = await prisma.session.create({
    data: {
      commerceId: commerceFicticia.id,
      channelConnectionId: acmeChannelConn.id,
      customerIdentifier: '+34600456456',
      status: 'CLOSED',
      isTest: false,
    }
  });
  await prisma.message.createMany({
    data: [
      { sessionId: acmeSession6.id, role: 'user', content: 'El código de descuento VIP20 no me funciona en el carrito.' },
      { sessionId: acmeSession6.id, role: 'assistant', content: 'El código VIP20 solo es válido para compras superiores a 50€.', tokensUsed: 22, latencyMs: 500 },
      { sessionId: acmeSession6.id, role: 'user', content: 'Mi compra es de 60€ y sigue dando error.' },
      { sessionId: acmeSession6.id, role: 'assistant', content: 'Entiendo. Paso tu consulta a un humano para que lo revise.', tokensUsed: 20, latencyMs: 450 },
      { sessionId: acmeSession6.id, role: 'system', content: 'Instrucción interna: Aplícale un 20% manual' },
      { sessionId: acmeSession6.id, role: 'assistant', content: 'Hola, perdona el fallo informático. Ya he aplicado un 20% de descuento manual a tu carrito. Puedes recargar la página y proceder al pago.' },
      { sessionId: acmeSession6.id, role: 'user', content: 'Mil gracias, ya está pagado.' }
    ]
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
