"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MobileUrgentAlert() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    fetch('/api/metrics').then(res => res.json()).then(data => {
      if (data.pendingCount !== undefined) setPendingCount(data.pendingCount);
    });

    // Poll every 10 seconds
    const interval = setInterval(() => {
      fetch('/api/metrics').then(res => res.json()).then(data => {
        if (data.pendingCount !== undefined) setPendingCount(data.pendingCount);
      });
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Ocultar si estamos ya dentro del inbox activo o si no hay pendientes
  if (pendingCount === 0 || pathname === '/conversaciones') {
    return null;
  }

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 animate-fade-in-down">
      <Link href="/conversaciones" className="block w-full">
        <div className="bg-red-600 shadow-none text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl animate-pulse">⚠️</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight">¡Requiere Atención!</span>
              <span className="text-xs text-red-100">{pendingCount} cliente{pendingCount > 1 ? 's' : ''} esperando humano</span>
            </div>
          </div>
          <div className="bg-card/20 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">
            Ir al chat →
          </div>
        </div>
      </Link>
    </div>
  );
}
