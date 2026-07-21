"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle'|'saving'|'success'>('idle');
  const [toast, setToast] = useState('');
  const [showWooModal, setShowWooModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [isExtractingTone, setIsExtractingTone] = useState(false);

  const [userRole, setUserRole] = useState<string>('OWNER');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabQuery = params.get('tab');
    if (tabQuery && ['general', 'canales', 'tienda', 'suscripcion', 'equipo'].includes(tabQuery)) {
      setActiveTab(tabQuery);
    }
    
    const successQuery = params.get('integration_success');
    if (successQuery === 'meta') {
      setTimeout(() => showToast('Meta conectado correctamente 🎉'), 500);
      setActiveTab('canales');
      window.history.replaceState(null, '', '/ajustes?tab=canales');
    }

    const errorQuery = params.get('integration_error');
    if (errorQuery) {
      setTimeout(() => showToast('Error conectando con Meta 😢'), 500);
      setActiveTab('canales');
      window.history.replaceState(null, '', '/ajustes?tab=canales');
    }

    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.success) {
        setUserRole(data.user.role);
      }
    });

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings(data.settings);
        } else {
          showToast('Error al cargar la configuración');
        }
        setLoading(false);
      });
  }, []);

  const handleSaveGeneral = async (e: any) => {
    e.preventDefault();
    setSaveState('saving');
    const form = e.target;
    
    const body = {
      name: form.name.value,
      address: form.address.value,
      businessHours: form.businessHours.value,
      systemPrompt: form.systemPrompt.value
    };

    const res = await fetch('/api/settings/general', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      showToast('Configuración general guardada');
      setSettings({...settings, general: body});
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      showToast('Error al guardar configuración');
      setSaveState('idle');
    }
  };

  const handleExtractTone = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsExtractingTone(true);
    showToast('Analizando chat con OpenAI...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('commerceId', 'commerce-seed-id');

    try {
      const res = await fetch('/api/settings/tone', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSettings({...settings, general: { ...settings.general, systemPrompt: data.prompt }});
        showToast('Tono de marca extraído y actualizado');
      } else {
        showToast('Error al extraer tono: ' + data.error);
      }
    } catch (err) {
      showToast('Error de conexión');
    }
    setIsExtractingTone(false);
  };

  const handleSaveWoo = async (e: any) => {
    e.preventDefault();
    setSaveState('saving');
    const form = e.target;
    
    const body = {
      wooUrl: form.wooUrl.value,
      wooConsumerKey: form.wooConsumerKey.value,
      wooConsumerSecret: form.wooConsumerSecret.value
    };

    const res = await fetch('/api/settings/channels', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      showToast('Tienda configurada correctamente');
      setSettings({...settings, store: { ...settings.store, wooConnected: true, wooUrl: body.wooUrl }});
      setSaveState('success');
      setTimeout(() => { setSaveState('idle'); setShowWooModal(false); }, 1500);
    } else {
      showToast('Error al conectar tienda');
      setSaveState('idle');
    }
  };

  const handleInviteTeam = async (e: any) => {
    e.preventDefault();
    setSaveState('saving');
    const form = e.target;
    
    const body = {
      email: form.email.value,
      role: form.role.value,
      password: form.password.value
    };

    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      const data = await res.json();
      showToast('Miembro añadido al equipo');
      setSettings({...settings, team: [...(settings.team || []), data.user]});
      setSaveState('success');
      setTimeout(() => { setSaveState('idle'); setShowTeamModal(false); }, 1500);
    } else {
      const err = await res.json();
      showToast(`Error: ${err.error}`);
      setSaveState('idle');
    }
  };

  const handleDeleteTeamMember = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar a este miembro del equipo?')) return;
    
    const res = await fetch(`/api/team?id=${userId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Miembro eliminado');
      setSettings({...settings, team: settings.team.filter((u: any) => u.id !== userId)});
    } else {
      const err = await res.json();
      showToast(`Error: ${err.error}`);
    }
  };

  if (loading) return <div className="p-8 font-sans text-muted-foreground flex justify-center items-center h-screen">Cargando tu configuración...</div>;

  let availableTabs = [
    { id: 'general', label: 'General', icon: '🏪' },
    { id: 'canales', label: 'Canales (WhatsApp/Meta)', icon: '💬' },
    { id: 'voz', label: 'Asistente de Voz', icon: '🎙️' },
    { id: 'tienda', label: 'Tienda Online', icon: '🛒' },
    { id: 'suscripcion', label: 'Suscripción', icon: '💳' },
    { id: 'equipo', label: 'Equipo', icon: '👥' },
  ];

  if (userRole !== 'OWNER') {
    availableTabs = availableTabs.filter(t => t.id !== 'suscripcion');
  }

  return (
    <div className="flex-1 min-h-screen bg-background font-sans p-8 overflow-y-auto relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-8 right-8 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl font-medium text-sm animate-bounce z-50">
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto flex gap-8">
        {/* Settings Sidebar */}
        <div className="w-64 flex-shrink-0">
          <h1 className="text-2xl font-bold text-foreground mb-6">Ajustes</h1>
          <nav className="flex flex-col space-y-1">
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeTab === tab.id
                    ? 'bg-primary/20 text-indigo-900' // Mejorado contraste (era bg-primary/10 text-indigo-700)
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                <span className="mr-3">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-card rounded-lg shadow-none border border-border p-8 min-h-[600px]">
          
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Información General</h2>
                <p className="text-sm text-muted-foreground mt-1">Actualiza los datos básicos de tu negocio y cómo debe comportarse tu asistente.</p>
              </div>

              <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-2">Nombre Comercial</label>
                    <input name="name" defaultValue={settings?.general?.name} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-2">Dirección Física (Opcional)</label>
                    <input name="address" defaultValue={settings?.general?.address} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Calle Ejemplo 123" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">Horario Comercial</label>
                  <input name="businessHours" defaultValue={settings?.general?.businessHours} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="L-V 09:00 a 18:00, Sábados 10:00 a 14:00" />
                  <p className="text-xs text-muted-foreground mt-2">La IA utilizará este horario para informar a los clientes si preguntan cuándo están abiertos.</p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <label className="block text-sm font-semibold text-muted-foreground">Comportamiento del Asistente (Prompt)</label>
                      <p className="text-xs text-muted-foreground mb-3">Dale instrucciones claras a tu IA sobre cómo hablar, qué tono usar y reglas especiales.</p>
                    </div>
                    <label className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 border border-indigo-200
                      ${isExtractingTone ? 'bg-primary/20 text-indigo-800' : 'bg-primary/10 text-indigo-700 hover:bg-primary/20'}`}>
                      {isExtractingTone ? (
                        <><span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span> Extrayendo...</>
                      ) : (
                        <>✨ Autogenerar desde WhatsApp</>
                      )}
                      <input type="file" className="hidden" accept=".txt" onChange={handleExtractTone} disabled={isExtractingTone} />
                    </label>
                  </div>
                  <textarea 
                    name="systemPrompt" 
                    value={settings?.general?.systemPrompt || ''}
                    onChange={(e) => setSettings({...settings, general: {...settings.general, systemPrompt: e.target.value}})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-40 resize-none font-mono text-sm text-foreground bg-background"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={saveState !== 'idle'} className={`text-white font-semibold py-2.5 px-6 rounded-lg transition-all flex items-center justify-center gap-2 min-w-[160px]
                    ${saveState === 'success' ? 'bg-green-500' : 'bg-slate-900 hover:bg-slate-800 disabled:opacity-50'}`}>
                    {saveState === 'idle' && 'Guardar Cambios'}
                    {saveState === 'saving' && <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...</>}
                    {saveState === 'success' && <>✓ Guardado</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'canales' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Canales de Mensajería</h2>
                <p className="text-sm text-muted-foreground mt-1">Conecta tus activos oficiales de Meta (WhatsApp, Facebook e Instagram) con un solo clic.</p>
              </div>

              <div className="p-6 border border-gray-100 rounded-lg flex items-center justify-between bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex items-center gap-5 relative z-10">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-3xl shadow-none transition-colors duration-300 ${settings?.channels?.metaConnected ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-200' : 'bg-card text-gray-400'}`}>
                    {settings?.channels?.metaConnected ? '✨' : '📱'}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">Ecosistema Meta</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                      Estado: {settings?.channels?.metaConnected ? <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Conectado y Operativo</span> : <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Desconectado</span>}
                    </p>
                    {settings?.channels?.connections?.map((conn: any) => (
                      <p key={conn.id} className="text-xs text-gray-400 mt-2 font-medium">
                        ID: <span className="font-mono bg-background px-1.5 py-0.5 rounded">{conn.accountId || conn.phoneId}</span> | Expira: {new Date(conn.expiresAt).toLocaleDateString()}
                      </p>
                    ))}
                  </div>
                </div>
                <a 
                  href="/api/meta/auth"
                  className="relative z-10 px-5 py-2.5 border border-border rounded-lg text-sm font-semibold hover:bg-background hover:border-gray-300 text-muted-foreground inline-block transition-all duration-200 active:scale-95 shadow-none"
                >
                  {settings?.channels?.metaConnected ? 'Actualizar Permisos' : 'Conectar con Meta'}
                </a>
              </div>
            </div>
          )}

          {activeTab === 'voz' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 h-full flex flex-col">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
                  Asistente de Voz AI
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/20 rounded-full">Próximamente</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Lleva tu atención al cliente al siguiente nivel con agentes de voz ultra-realistas que responden llamadas 24/7.</p>
              </div>

              <div className="flex-1 min-h-[400px] relative rounded-lg overflow-hidden border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 flex flex-col items-center justify-center p-12 text-center group">
                {/* Decorative background elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
                
                <div className="relative z-10">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-4xl shadow-xl shadow-indigo-200 mb-8 transform group-hover:scale-110 transition-transform duration-500">
                    <span className="text-white relative">
                      🎙️
                      <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></div>
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4 tracking-tight">
                    El futuro de las llamadas está aquí
                  </h3>
                  
                  <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                    Estamos integrando tecnología de clonación de voz de última generación (ElevenLabs/OpenAI Realtime) para que tu IA atienda llamadas telefónicas, tome reservas y cierre ventas con un tono humano y persuasivo.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold shadow-none hover:bg-gray-800 transition-all active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 flex items-center gap-2">
                      <span>Notificarme cuando esté listo</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </button>
                    <button className="px-6 py-3 bg-card text-muted-foreground border border-border rounded-lg font-semibold hover:bg-background transition-all active:scale-95 shadow-none">
                      Ver Demo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tienda' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Catálogo y Tienda</h2>
                <p className="text-sm text-muted-foreground mt-1">Ajustes de sincronización con tu e-commerce.</p>
              </div>

              <div className="p-5 border border-border rounded-lg flex items-center justify-between bg-background/50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-none ${settings?.store?.wooConnected ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'}`}>
                    🛍️
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">WooCommerce</h3>
                    <p className="text-sm text-muted-foreground">
                      URL: {settings?.store?.wooUrl || 'No configurado'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowWooModal(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-background text-muted-foreground"
                >
                  {settings?.store?.wooConnected ? 'Editar Credenciales' : 'Conectar Tienda'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'suscripcion' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Suscripción y Facturación</h2>
                <p className="text-sm text-muted-foreground mt-1">Gestiona tu plan actual, métodos de pago y descarga tus facturas.</p>
              </div>

              <div className="bg-primary/10 border border-indigo-100 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="bg-primary/20 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                      {settings?.subscription?.isLifetimeFree ? 'PLAN LIFETIME VIP' : 'PLAN PROFESIONAL'}
                    </span>
                    <h3 className="text-2xl font-bold text-foreground mt-2">
                      {settings?.subscription?.isLifetimeFree ? 'Acceso Gratuito de por Vida' : '49€ / mes'}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-indigo-950/80 mb-6 font-medium">
                  {settings?.subscription?.isLifetimeFree 
                    ? 'Tienes acceso total al sistema sin coste. Gracias por ser Beta Tester.'
                    : 'Tu suscripción incluye IA conversacional ilimitada hasta 5.000 chats mensuales.'}
                </p>

                <div className="flex gap-4">
                  <button 
                    onClick={() => alert("Abriría el Portal de Stripe para gestionar métodos de pago")}
                    className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
                  >
                    Gestionar Pago en Stripe
                  </button>
                </div>
              </div>

              {/* Historial de Facturación In-App */}
              <div className="border border-border rounded-lg overflow-hidden mt-8">
                <div className="bg-background px-6 py-4 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground">Historial de Facturación</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-card">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Importe</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Factura</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-100">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">01 Jun 2026</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">49.00 €</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-md bg-green-100 text-green-800 border border-green-200">
                          Pagado
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary hover:text-indigo-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Descargar PDF</button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">01 May 2026</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">49.00 €</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-md bg-green-100 text-green-800 border border-green-200">
                          Pagado
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary hover:text-indigo-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Descargar PDF</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'equipo' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Miembros del Equipo</h2>
                <p className="text-sm text-muted-foreground mt-1">Administra quién tiene acceso a la plataforma.</p>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {settings?.team?.map((user: any) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-indigo-700 font-bold text-sm">
                              {user.email[0].toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-card text-foreground">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {user.role !== 'OWNER' && (
                            <button onClick={() => handleDeleteTeamMember(user.id)} className="text-gray-400 hover:text-red-600 transition-colors">Eliminar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button 
                onClick={() => setShowTeamModal(true)}
                className="px-4 py-3 border-2 border-dashed border-gray-300 text-muted-foreground font-semibold rounded-lg w-full hover:border-indigo-500 hover:text-primary hover:bg-primary/10/50 transition-all"
              >
                + Invitar nuevo miembro
              </button>
            </div>
          )}

        </div>
      </div>


      {/* MODAL WOOCOMMERCE */}
      {showWooModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full flex overflow-hidden">
            {/* Columna Izquierda: Tutorial */}
            <div className="w-1/2 bg-purple-50 p-8 border-r border-purple-100">
              <h3 className="text-xl font-bold text-purple-900 mb-4">¿Cómo conectar tu Tienda?</h3>
              <p className="text-sm text-purple-800 mb-6">Para que la IA pueda recomendar tus productos y consultar el stock, necesita leer el catálogo de tu WooCommerce.</p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-purple-900">Entra al panel de administración de tu WordPress.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="text-sm text-purple-900">Ve a <strong>WooCommerce {'>'} Ajustes {'>'} Avanzado {'>'} API REST</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <p className="text-sm text-purple-900">Haz clic en <strong>Añadir clave</strong>. Dale un nombre ("Mi IA") y dale permisos de <em>Lectura/Escritura</em>. Genera y pega aquí la Clave y el Secreto.</p>
                </div>
              </div>
            </div>
            
            {/* Columna Derecha: Formulario */}
            <div className="w-1/2 p-8 bg-card relative">
              <button onClick={() => setShowWooModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-muted-foreground text-xl font-bold">
                ✕
              </button>
              <h3 className="text-xl font-bold text-foreground mb-6">Credenciales API</h3>
              
              <form onSubmit={handleSaveWoo} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">URL de tu tienda</label>
                  <input name="wooUrl" required type="url" defaultValue={settings?.store?.wooUrl} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="https://mitienda.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">Clave de cliente (Consumer Key)</label>
                  <input name="wooConsumerKey" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm" placeholder="ck_..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">Secreto de cliente (Consumer Secret)</label>
                  <input name="wooConsumerSecret" required type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm" placeholder="cs_..." />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={saveState !== 'idle'} className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all flex justify-center items-center gap-2
                    ${saveState === 'success' ? 'bg-green-500' : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50'}`}>
                    {saveState === 'idle' && 'Sincronizar Tienda'}
                    {saveState === 'saving' && <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Conectando...</>}
                    {saveState === 'success' && <>✓ Tienda Sincronizada</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EQUIPO */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-8 relative">
            <button onClick={() => setShowTeamModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-muted-foreground text-xl font-bold">
              ✕
            </button>
            <h3 className="text-xl font-bold text-foreground mb-2">Invitar al Equipo</h3>
            <p className="text-sm text-muted-foreground mb-6">Crea una cuenta para que tu equipo atienda el inbox.</p>
            
            <form onSubmit={handleInviteTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1">Email</label>
                <input name="email" required type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="ejemplo@empresa.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1">Rol</label>
                <select name="role" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  <option value="AGENT">Agente (Solo Inbox)</option>
                  <option value="ADMIN">Administrador (Todo excepto facturación)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1">Contraseña temporal</label>
                <input name="password" required type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="••••••••" />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={saveState !== 'idle'} className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all flex justify-center items-center gap-2
                  ${saveState === 'success' ? 'bg-green-500' : 'bg-primary hover:bg-primary/90 disabled:opacity-50'}`}>
                  {saveState === 'idle' && 'Crear Usuario'}
                  {saveState === 'saving' && <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Invitando...</>}
                  {saveState === 'success' && <>✓ Usuario Añadido</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
