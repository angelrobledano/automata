"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MetaEmbeddedSignupButton } from '@/components/MetaEmbeddedSignupButton';

export default function MetaOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ waPhoneNumberId: '', waToken: '' });
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if (res.ok) {
        router.push(data.redirect);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="w-4 h-4 rounded-full bg-blue-600 inline-block mb-2"></span>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Paso 2 de 2: Conecta tu WhatsApp 💬
        </h2>
        <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
          Conecta tu número oficial de empresa en 3 clics con la garantía y seguridad de Meta Cloud API.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs border border-red-100 font-medium">
              {error}
            </div>
          )}

          {/* OPCIÓN PRINCIPAL: EMBEDDED SIGNUP (3 CLICS) */}
          <div className="space-y-4 text-center">
            <MetaEmbeddedSignupButton 
              onSuccess={() => router.push('/dashboard')}
              onError={(msg) => setError(msg)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] transition-all cursor-pointer items-center gap-2"
              buttonText="Conectar con Facebook / Meta (Oficial)"
            />
            <p className="text-[11px] text-slate-400">
              ⚡ Sin requerir conocimientos técnicos. Configuración modal nativa de Meta.
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">O bien</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* OPCIÓN SECUNDARIA: MANUAL O CONFIGURAR LUEGO */}
          {!showManual ? (
            <div className="space-y-3">
              <button 
                type="button"
                onClick={() => setShowManual(true)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Introducir identificadores manualmente (Avanzado)
              </button>
              <button 
                type="button"
                onClick={async () => {
                  setLoading(true);
                  const res = await fetch('/api/onboarding/meta', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ skip: true })
                  });
                  const data = await res.json();
                  if (res.ok) router.push(data.redirect);
                  else setError('Error al saltar el paso');
                  setLoading(false);
                }}
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Configurar más tarde (Ir al Dashboard)
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Phone Number ID</label>
                <input placeholder="Ej. 1029384756" required type="text" value={form.waPhoneNumberId} onChange={e => setForm({...form, waPhoneNumberId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meta Access Token (Permanente)</label>
                <input placeholder="EAAxx..." required type="password" value={form.waToken} onChange={e => setForm({...form, waToken: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50" />
              </div>

              <div className="space-y-2 pt-2">
                <button disabled={loading} type="submit" className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-xs cursor-pointer">
                  {loading ? 'Verificando con Meta...' : 'Guardar y Activar Asistente'}
                </button>
                <button type="button" onClick={() => setShowManual(false)} className="w-full text-xs text-slate-500 hover:underline">
                  Volver a opción automática
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
