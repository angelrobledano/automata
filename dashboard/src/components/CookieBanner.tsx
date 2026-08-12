'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 z-50 flex flex-col gap-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="leading-relaxed text-slate-300">
          Utilizamos cookies esenciales para el funcionamiento de la plataforma y garantizar la seguridad de tu sesión.{' '}
          <Link href="/privacy" className="text-blue-400 underline hover:text-blue-300">
            Más información en nuestra Política de Privacidad
          </Link>.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={accept}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
