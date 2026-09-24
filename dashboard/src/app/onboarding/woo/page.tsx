"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Zap, ChevronDown, ChevronRight, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

export default function WooOnboardingPage() {
  const router = useRouter();
  const [storeUrl, setStoreUrl] = useState('');
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [errorAuto, setErrorAuto] = useState('');

  // Modo manual colapsable
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ wooUrl: '', wooConsumerKey: '', wooConsumerSecret: '' });
  const [loadingManual, setLoadingManual] = useState(false);
  const [errorManual, setErrorManual] = useState('');

  // 1. Conexión automática en 1 clic
  const handleAutoConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeUrl.trim() || loadingAuto) return;
    setLoadingAuto(true);
    setErrorAuto('');

    try {
      const res = await fetch('/api/onboarding/woo/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wooUrl: storeUrl, returnContext: 'onboarding' })
      });

      const data = await res.json();
      if (res.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setErrorAuto(data.error || 'No se pudo iniciar la conexión con WooCommerce.');
        setLoadingAuto(false);
      }
    } catch (err) {
      setErrorAuto('Error de conexión con el servidor.');
      setLoadingAuto(false);
    }
  };

  // 2. Conexión manual con claves (respaldo)
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingManual) return;
    setLoadingManual(true);
    setErrorManual('');

    try {
      const res = await fetch('/api/onboarding/woo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm)
      });

      const data = await res.json();
      if (res.ok) {
        router.push(data.redirect || '/onboarding/meta');
      } else {
        setErrorManual(data.error || 'Error al validar las credenciales.');
      }
    } catch (err) {
      setErrorManual('Error de conexión con la tienda.');
    } finally {
      setLoadingManual(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 shadow-xs mb-2">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Paso 1 de 2: Conecta tu tienda WooCommerce
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Sincroniza tus productos y pedidos para que tu asistente de WhatsApp empiece a responder existencias y tomar encargos al instante.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-5 sm:px-8 border border-slate-200 rounded-2xl shadow-xs space-y-6">

          {/* MÉTODO PRINCIPAL: 1 CLIC */}
          <form onSubmit={handleAutoConnect} className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Conexión instantánea en 1 solo clic
              </h2>
            </div>

            {errorAuto && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200">
                {errorAuto}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dirección web de tu tienda
              </label>
              <input
                type="text"
                placeholder="https://mitienda.com"
                required
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Introduce la dirección de tu WordPress/WooCommerce.
              </p>
            </div>

            <button
              type="submit"
              disabled={loadingAuto || !storeUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{loadingAuto ? 'Redirigiendo a tu tienda...' : 'Conectar mi tienda en 1 clic'}</span>
            </button>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Se abrirá la pantalla de autorización oficial de tu WordPress para que apruebes el acceso de forma 100% segura y sin introducir claves manuales.
              </span>
            </div>
          </form>

          {/* MÉTODO ALTERNATIVO: CLAVES MANUALES COLAPSABLES */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowManual(!showManual)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1 cursor-pointer"
            >
              <span>¿Prefieres configurar las claves API manualmente?</span>
              {showManual ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {showManual && (
              <form onSubmit={handleManualSubmit} className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                {errorManual && (
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200">
                    {errorManual}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">URL de la tienda (HTTPS)</label>
                  <input
                    type="url"
                    placeholder="https://mitienda.com"
                    required
                    value={manualForm.wooUrl}
                    onChange={(e) => setManualForm({ ...manualForm, wooUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Consumer Key (ck_...)</label>
                  <input
                    type="text"
                    placeholder="ck_xxxxxxxxxxxxxxxx"
                    required
                    value={manualForm.wooConsumerKey}
                    onChange={(e) => setManualForm({ ...manualForm, wooConsumerKey: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Consumer Secret (cs_...)</label>
                  <input
                    type="password"
                    placeholder="cs_xxxxxxxxxxxxxxxx"
                    required
                    value={manualForm.wooConsumerSecret}
                    onChange={(e) => setManualForm({ ...manualForm, wooConsumerSecret: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingManual}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loadingManual ? 'Validando claves...' : 'Validar y conectar manualmente'}
                </button>
              </form>
            )}
          </div>

          {/* BOTÓN SALTAR PASO */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => router.push('/onboarding/meta')}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-semibold cursor-pointer"
            >
              No tengo tienda online aún (Saltar este paso) →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
