"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';

function WooReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (success === '1') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/onboarding/meta');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [success, router]);

  const isSuccess = success === '1';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center space-y-6">
        {isSuccess ? (
          <>
            <div className="mx-auto w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                ¡Tienda WooCommerce conectada!
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tu tienda ha autorizado la vinculación con Automata. Tu catálogo y pedidos ya están sincronizándose con la Inteligencia Artificial.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
              Redirigiendo a la configuración de WhatsApp en <span className="font-bold text-blue-600">{countdown}s</span>...
            </div>

            <button
              onClick={() => router.push('/onboarding/meta')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>Continuar de inmediato</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Autorización no completada
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                La conexión no se ha podido verificar o fue cancelada desde tu panel de WordPress. Puedes volver a intentarlo o ingresar tus claves manualmente.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => router.push('/onboarding/woo')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reintentar conexión</span>
              </button>

              <button
                onClick={() => router.push('/onboarding/meta')}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Saltar por ahora y configurar WhatsApp
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function WooReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">
        Verificando conexión con WooCommerce...
      </div>
    }>
      <WooReturnContent />
    </Suspense>
  );
}
