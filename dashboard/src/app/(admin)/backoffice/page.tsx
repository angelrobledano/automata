"use client";

import { useState, useEffect } from 'react';

export default function BackofficeDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [commerces, setCommerces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/metrics').then(res => res.json()),
      fetch('/api/admin/commerces').then(res => res.json())
    ]).then(([metricsData, commercesData]) => {
      if (metricsData.success) setMetrics(metricsData.metrics);
      if (commercesData.success) setCommerces(commercesData.commerces);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-10 font-sans text-muted-foreground">Cargando God Mode...</div>;

  return (
    <div className="min-h-screen bg-background font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-gray-900 text-white p-6 rounded-lg shadow-none">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-red-500 flex items-center gap-2">
              <span>⚡</span> Automata God Mode
            </h1>
            <p className="text-sm text-gray-400 mt-1">Torre de control operativa y estado de flota</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              Sistema Operacional
            </span>
          </div>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card p-6 rounded-lg shadow-none border border-border">
            <h3 className="text-sm font-medium text-muted-foreground">Comercios Totales</h3>
            <p className="text-3xl font-bold text-foreground mt-2">{metrics?.totalCommerces}</p>
            <p className="text-xs text-green-600 mt-1">↑ {metrics?.activeCommerces} Activos (Onboarded)</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-none border border-border">
            <h3 className="text-sm font-medium text-muted-foreground">Mensajes IA Procesados</h3>
            <p className="text-3xl font-bold text-foreground mt-2">{metrics?.totalMessages}</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-none border border-border">
            <h3 className="text-sm font-medium text-muted-foreground">Conversaciones (Sesiones)</h3>
            <p className="text-3xl font-bold text-foreground mt-2">{metrics?.totalSessions}</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-none border border-border">
            <h3 className="text-sm font-medium text-muted-foreground">Estado de Cola (Workers)</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">Despejado</p>
            <p className="text-xs text-muted-foreground mt-1">0 jobs pendientes</p>
          </div>
        </div>

        {/* Create Commerce Form */}
        <div className="bg-card p-6 rounded-lg shadow-none border border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">Crear Nueva Empresa (Beta Tester)</h2>
          <form 
            className="flex flex-wrap gap-4 items-end"
            onSubmit={async (e: any) => {
              e.preventDefault();
              const form = e.target;
              const res = await fetch('/api/admin/commerces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: form.name.value,
                  email: form.email.value,
                  password: form.password.value,
                  isLifetimeFree: form.isLifetimeFree.checked
                })
              });
              if(res.ok) {
                form.reset();
                window.location.reload();
              } else {
                alert('Error al crear la empresa');
              }
            }}
          >
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre</label>
              <input name="name" required className="px-3 py-2 border rounded-lg text-sm w-48" placeholder="Empresa S.L." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Email (Login)</label>
              <input type="email" name="email" required className="px-3 py-2 border rounded-lg text-sm w-48" placeholder="ceo@empresa.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Contraseña temporal</label>
              <input type="password" name="password" required className="px-3 py-2 border rounded-lg text-sm w-40" placeholder="123456" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" name="isLifetimeFree" id="isLifetimeFree" defaultChecked className="w-4 h-4 rounded text-red-600" />
              <label htmlFor="isLifetimeFree" className="text-sm font-semibold text-red-600">Acceso VIP (Gratis)</label>
            </div>
            <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800">
              Crear Empresa
            </button>
          </form>
        </div>

        {/* CRM Table */}
        <div className="bg-card rounded-lg shadow-none border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-background">
            <h2 className="text-lg font-bold text-foreground">Directorio de Clientes</h2>
            <input 
              type="search" 
              placeholder="Buscar comercio..." 
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comercio</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Onboarding</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Volumen</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registro</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {commerces.map((c) => (
                <tr key={c.id} className="hover:bg-background transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.id.split('-')[0]}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {c.onboardingCompleted ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Completado</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Incompleto</span>
                    )}
                    <div className="flex gap-1 mt-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.waConnected ? 'bg-primary/20 text-indigo-700' : 'bg-card text-muted-foreground'}`}>WhatsApp</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.wooConnected ? 'bg-purple-100 text-purple-700' : 'bg-card text-muted-foreground'}`}>WooCommerce</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">{c.sessionsCount} sesiones</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={async () => {
                        const confirm = window.confirm(`¿Seguro que quieres ${c.isLifetimeFree ? 'REVOCAR' : 'DAR'} acceso de por vida a ${c.name}?`);
                        if(confirm) {
                          await fetch('/api/admin/commerces/free', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ commerceId: c.id, isFree: !c.isLifetimeFree })
                          });
                          window.location.reload();
                        }
                      }}
                      className={`mr-3 px-2 py-1 rounded text-xs font-bold ${c.isLifetimeFree ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {c.isLifetimeFree ? 'Revocar Acceso' : 'Regalar Acceso'}
                    </button>
                    <button className="text-red-600 hover:text-red-900 font-bold" onClick={() => alert('Abriría Stripe Dashboard en una ventana nueva')}>Stripe ↗</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
