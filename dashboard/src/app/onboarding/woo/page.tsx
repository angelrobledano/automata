"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WooOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ wooUrl: '', wooConsumerKey: '', wooConsumerSecret: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding/woo', {
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
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Paso 1 de 2: Conecta tu tienda 🛒
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Para que tu IA pueda leer tu catálogo y procesar pedidos, necesitamos conectar tu WooCommerce.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">URL de tu Tienda</label>
              <div className="mt-1">
                <input placeholder="https://mitienda.com" required type="url" value={form.wooUrl} onChange={e => setForm({...form, wooUrl: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Consumer Key</label>
              <div className="mt-1">
                <input placeholder="ck_xxxxx" required type="text" value={form.wooConsumerKey} onChange={e => setForm({...form, wooConsumerKey: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Consumer Secret</label>
              <div className="mt-1">
                <input placeholder="cs_xxxxx" required type="password" value={form.wooConsumerSecret} onChange={e => setForm({...form, wooConsumerSecret: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>

            <div className="space-y-3">
              <button disabled={loading} type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors">
                {loading ? 'Validando conexión...' : 'Conectar y Validar'}
              </button>
              <button 
                type="button"
                onClick={() => router.push('/onboarding/meta')}
                className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                No tengo tienda aún (Saltar paso)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
