import { NextResponse } from 'next/server';
import { addDocumentFromFile } from '../../../../../src/rag/index';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const commerceId = payload.commerceId as string;
    const category = (formData.get('category') as string) || 'GENERAL';

    if (!file) {
      return NextResponse.json({ error: 'Por favor, selecciona un archivo antes de hacer clic en subir.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Procesar el documento directamente de forma síncrona para memorizarlo al instante
    const result = await addDocumentFromFile(commerceId, file.name, buffer, category);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    let msg = error.message || 'Error al procesar el archivo';
    if (msg.includes('Incorrect API key')) {
      msg = 'La clave de IA proporcionada no parece válida. Revísala en Ajustes para continuar.';
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
