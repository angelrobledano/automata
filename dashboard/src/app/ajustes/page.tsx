"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, MessageSquare, ShoppingBag, ShieldCheck, Users, Sliders, CheckCircle2, AlertCircle, Sparkles, Upload, RefreshCw, Key, CreditCard, ChevronDown, ChevronRight, Lock
} from 'lucide-react';

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
    if (tabQuery && ['general', 'canales', 'tienda', 'suscripcion', 'equipo', 'avanzado'].includes(tabQuery)) {
      setActiveTab(tabQuery);
    }
    
    const successQuery = params.get('integration_success');
    if (successQuery === 'meta') {
      setTimeout(() => showToast('WhatsApp / Meta conectado correctamente 🎉'), 500);
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
      systemPrompt: form.systemPrompt?.value || settings?.general?.systemPrompt || ''
    };

    const res = await fetch('/api/settings/general', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      showToast('Configuración guardada correctamente');
      setSettings({...settings, general: body});
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      showToast('Error al guardar la configuración');
      setSaveState('idle');
    }
  };

  const handleExtractTone = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsExtractingTone(true);
    showToast('Analizando estilo de comunicación con IA...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/settings/tone', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setSettings({
          ...settings,
          general: { ...settings.general, systemPrompt: data.tonePrompt }
        });
        showToast('¡Estilo y tono adaptados a tu negocio!');
      } else {
        showToast(data.error || 'Error al analizar el estilo');
      }
    } catch (err) {
      showToast('Error en la comunicación con el servidor');
    } finally {
      setIsExtractingTone(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-slate-500 text-xs font-semibold">Cargando opciones del negocio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-16">
      <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
        
        {/* HEADER PRINCIPAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuración</h1>
            <p className="text-xs text-slate-500 mt-0.5">Gestiona las opciones de tu negocio, canales conectados y cuenta</p>
          </div>
        </div>

        {/* TOAST / AVISOS */}
        {toast && (
          <div className="p-4 rounded-xl border text-xs font-semibold flex items-center justify-between bg-white border-slate-200 shadow-xs">
            <span>{toast}</span>
            <button onClick={() => setToast('')} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>
        )}

        {/* PESTAÑAS COMERCIALES */}
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'general' ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Mi negocio
          </button>
          <button 
            onClick={() => setActiveTab('canales')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'canales' ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </button>
          <button 
            onClick={() => setActiveTab('tienda')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'tienda' ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Catálogo / Tienda
          </button>
          <button 
            onClick={() => setActiveTab('suscripcion')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'suscripcion' ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Uso y costes
          </button>
          <button 
            onClick={() => setActiveTab('equipo')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'equipo' ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Cuenta y equipo
          </button>
          <button 
            onClick={() => setActiveTab('avanzado')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ml-auto ${
              activeTab === 'avanzado' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Avanzado
          </button>
        </div>

        {/* PESTAÑA 1: MI NEGOCIO */}
        {activeTab === 'general' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Información básica del negocio</h2>
              <p className="text-xs text-slate-500 mt-0.5">Establece los datos de contacto y atención que tu asistente compartirá con los clientes</p>
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre comercial de la empresa</label>
                  <input 
                    type="text" 
                    name="name"
                    defaultValue={settings?.general?.name || ''}
                    placeholder="Ej: Zapatería Central"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección física</label>
                  <input 
                    type="text" 
                    name="address"
                    defaultValue={settings?.general?.address || ''}
                    placeholder="Ej: Calle Mayor 12, Madrid"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Horarios de atención al público</label>
                <input 
                  type="text" 
                  name="businessHours"
                  defaultValue={settings?.general?.businessHours || ''}
                  placeholder="Ej: Lunes a Viernes de 9:00 a 20:00. Sábados de 10:00 a 14:00."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* EXTRAER ESTILO DE COMUNICACIÓN CON IA */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Adaptar estilo de comunicación automáticamente
                  </span>
                  {isExtractingTone && <span className="text-xs text-blue-600 font-semibold animate-pulse">Analizando...</span>}
                </div>
                <p className="text-[11px] text-slate-500">
                  Sube un archivo `.txt` con conversaciones pasadas con tus clientes para que la IA aprenda tu forma exacta de saludar y responder.
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  Sube un chat de ejemplo (.txt)
                  <input type="file" accept=".txt" onChange={handleExtractTone} className="hidden" />
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit"
                  disabled={saveState === 'saving'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {saveState === 'saving' ? 'Guardando...' : saveState === 'success' ? '¡Guardado!' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PESTAÑA 2: WHATSAPP */}
        {activeTab === 'canales' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Canal de comunicación de WhatsApp</h2>
              <p className="text-xs text-slate-500 mt-0.5">Conecta el número de teléfono oficial de tu negocio mediante Meta Cloud API</p>
            </div>

            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-base">💬</span>
                  WhatsApp Business (Meta Oficial)
                </span>
                <p className="text-xs text-slate-500">
                  {settings?.channels?.metaConnected 
                    ? 'Conectado correctamente. El asistente está respondiendo mensajes de WhatsApp.' 
                    : 'Vincula tu cuenta de WhatsApp Business con un solo clic.'}
                </p>
              </div>

              {settings?.channels?.metaConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Conectado
                </span>
              ) : (
                <a 
                  href="/api/meta/auth"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Conectar WhatsApp Business con Meta
                </a>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: CATÁLOGO / TIENDA */}
        {activeTab === 'tienda' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Catálogo de productos y comercio</h2>
              <p className="text-xs text-slate-500 mt-0.5">Conecta tu tienda online para sincronizar productos, precios y stock en tiempo real</p>
            </div>

            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-base">🛍️</span>
                  WooCommerce / Tienda online
                </span>
                <p className="text-xs text-slate-500">
                  Sincroniza tus productos para que la IA consulte disponibilidad y precios.
                </p>
              </div>

              <button 
                onClick={() => setShowWooModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Conectar WooCommerce
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: USO Y COSTES */}
        {activeTab === 'suscripcion' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Uso de IA y suscripción</h2>
              <p className="text-xs text-slate-500 mt-0.5">Supervisa el consumo mensual e información de tu plan</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <span className="text-xs font-semibold text-slate-500">Plan contratado</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Plan Profesional</h3>
                <p className="text-[11px] text-slate-500">Renovación automática</p>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <span className="text-xs font-semibold text-slate-500">Conversaciones mensual</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">2.350 / 5.000</h3>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '47%' }}></div>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <span className="text-xs font-semibold text-slate-500">Coste evitado estimado</span>
                <h3 className="text-lg font-bold text-emerald-600 mt-1">36,00 €</h3>
                <p className="text-[11px] text-slate-500">Trabajo recuperado este mes</p>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: CUENTA Y EQUIPO */}
        {activeTab === 'equipo' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Equipo y permisos</h2>
                <p className="text-xs text-slate-500 mt-0.5">Gestiona los agentes y administradores de tu negocio</p>
              </div>
              <button 
                onClick={() => setShowTeamModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Invitar miembro
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                    O
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Propietario</p>
                    <p className="text-[10px] text-slate-500">Acceso total a la cuenta</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full">PROPIETARIO</span>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 6: AVANZADO (INFORMACIÓN TÉCNICA) */}
        {activeTab === 'avanzado' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-500" />
                Configuración avanzada de la IA (Para desarrolladores)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Ajustes técnicos de modelos, prompts del sistema y webhooks</p>
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Instrucciones del sistema (System Prompt)</label>
                <textarea 
                  name="systemPrompt"
                  defaultValue={settings?.general?.systemPrompt || ''}
                  rows={6}
                  placeholder="Eres un asistente virtual de IA..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 font-mono outline-none focus:ring-2 focus:ring-blue-600 resize-y"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Guardar configuración avanzada
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
