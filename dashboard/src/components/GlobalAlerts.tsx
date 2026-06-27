"use client";

import { useEffect, useState } from 'react';

export function GlobalAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // In a real scenario, this could poll an /api/health endpoint
    // For now we check local storage or settings to see if critical things are missing
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.success) {
        const newAlerts = [];
        if (!data.settings.channels.waConnected) {
          newAlerts.push({ id: 'wa', type: 'warning', msg: '⚠️ WhatsApp no está conectado. El bot no puede recibir mensajes.' });
        }
        if (!data.settings.store.wooConnected) {
          newAlerts.push({ id: 'woo', type: 'warning', msg: '🛍️ WooCommerce no está conectado. El bot no puede recomendar productos reales.' });
        }
        setAlerts(newAlerts);
      }
    });
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-2xl px-4">
      {alerts.map(a => (
        <div key={a.id} className={`p-3 rounded-lg shadow-lg flex items-center justify-between text-sm font-medium
          ${a.type === 'error' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-900 border border-amber-200'}`}>
          <span>{a.msg}</span>
          <button onClick={() => setAlerts(prev => prev.filter(alert => alert.id !== a.id))} className="ml-4 opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}
