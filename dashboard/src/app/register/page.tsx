"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
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
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground tracking-tight">
          Crea tu cuenta en Automata
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Comienza a automatizar tus pedidos con IA
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-none sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Nombre de tu Comercio</label>
              <div className="mt-1">
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-none placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">Email</label>
              <div className="mt-1">
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-none placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">Contraseña</label>
              <div className="mt-1">
                <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-none placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <button disabled={loading} type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-none text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors">
                {loading ? 'Creando cuenta...' : 'Comenzar ahora'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
