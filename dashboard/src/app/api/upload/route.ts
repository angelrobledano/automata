import { NextResponse } from 'next/server';
import { addDocumentFromFile } from '../../../../../src/rag/index';

import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const commerceId = payload.commerceId;
    const category = formData.get('category') as string || 'GENERAL';

    if (!file) {
      return NextResponse.json({ error: 'Por favor, selecciona un archivo antes de hacer clic en subir.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Convertir el buffer a Base64 para poder encolarlo en BullMQ/Redis
    const fileBase64 = buffer.toString('base64');
    
    const { enqueueDocument } = require('../../../../../src/queue');
    await enqueueDocument({
      commerceId,
      filename: file.name,
      fileBuffer: fileBase64,
      category
    });

    return NextResponse.json({ success: true, result: { message: 'El documento ha entrado en la cola de procesamiento asíncrono y estará disponible pronto.' } });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    let msg = error.message;
    if (msg.includes('Incorrect API key')) msg = 'La clave de IA proporcionada no parece válida. Revísala en Ajustes para continuar.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
