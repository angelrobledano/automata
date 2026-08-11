"use client";

import { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft, UserCheck } from 'lucide-react';

export default function ImpersonationBanner() {
  const [session, setSession] = useState<{
    isImpersonating: boolean;
    user?: any;
    impersonator?: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.isImpersonating) {
          setSession({
            isImpersonating: true,
            user: data.user,
            impersonator: data.impersonator
          });
        }
      })
      .catch(() => null);
  }, []);

  if (!session || !session.isImpersonating) return null;

  const handleUnimpersonate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/unimpersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirect || '/backoffice';
      } else {
        alert(data.error || 'Error al salir del modo impersonación');
        setLoading(false);
      }
    } catch (err) {
      alert('Error de conexión al restaurar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 text-white border-b border-[#0066FF]/40 shadow-2xl px-4 py-2.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/40 animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-2">
              <span className="text-[#0066FF] font-bold uppercase tracking-wider">Modo Impersonación Activo</span>
              <span className="text-gray-400">•</span>
              <span>Empresa: <strong className="text-white">{session.user?.commerceName}</strong></span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
              <span>Usuario blanco: <code className="text-gray-200">{session.user?.email}</code> ({session.user?.role})</span>
              {session.impersonator && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <UserCheck className="w-3 h-3 text-[#0066FF]" />
                    Admin real: {session.impersonator.email}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleUnimpersonate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 whitespace-nowrap active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {loading ? 'Restaurando Sesión...' : 'Volver a mi sesión Admin'}
        </button>
      </div>
    </div>
  );
}
