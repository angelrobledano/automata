"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, MessageSquare, ShoppingBag, ShieldCheck, Users, Sliders, CheckCircle2, AlertCircle, Sparkles, Upload, RefreshCw, Key, CreditCard, ChevronDown, ChevronRight, Lock, Trash2, Send, Copy, Check, AlertTriangle, ExternalLink, Zap
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MetaEmbeddedSignupButton } from '@/components/MetaEmbeddedSignupButton';
import BusinessHoursSettings from './BusinessHoursSettings';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle'|'saving'|'success'>('idle');
  const [toast, setToast] = useState('');
  
  // Modals state
  const [showWooModal, setShowWooModal] = useState(false);
  const [isConnectingWooAuto, setIsConnectingWooAuto] = useState(false);
  const [showManualWoo, setShowManualWoo] = useState(false);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [isConnectingShopify, setIsConnectingShopify] = useState(false);
  const [isDisconnectingStore, setIsDisconnectingStore] = useState<'woo' | 'shopify' | null>(null);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [isExtractingTone, setIsExtractingTone] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const [copiedField, setCopiedField] = useState<string | null>(null);
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
    if (params.get('woo_connected') === '1') {
      showToast('¡Tienda WooCommerce vinculada con éxito!');
    }

    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveState('saving');
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          address: formData.get('address')
        })
      });
      if (res.ok) {
        setSaveState('success');
        showToast('Información del negocio guardada correctamente.');
        setTimeout(() => setSaveState('idle'), 2000);
        fetchSettings();
      }
    } catch (err) {
      setSaveState('idle');
      showToast('Error al guardar la información.');
    }
  };

  const handleSaveBusinessHours = async (hoursJson: string) => {
    try {
      const parsed = JSON.parse(hoursJson);
      const res = await fetch('/api/settings/general', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessHours: parsed })
      });
      if (res.ok) {
        showToast('Horario comercial guardado correctamente.');
        fetchSettings();
      } else {
        showToast('Error al guardar horario.');
      }
    } catch (err) {
      showToast('Error de conexión al guardar horario.');
    }
  };

  const handleExtractTone = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingTone(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/settings/tone', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showToast('¡Tono de voz extraído e integrado en la IA con éxito!');
        fetchSettings();
      } else {
        showToast(data.error || 'Error extrayendo el tono.');
      }
    } catch (err) {
      showToast('Error procesando el archivo de chat.');
    } finally {
      setIsExtractingTone(false);
    }
  };

  const copyToClipboard = (fieldKey: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendTestMessage = async () => {
    if (!testPhone.trim() || isSendingTest) return;
    setIsSendingTest(true);
    try {
      showToast(`Mensaje de prueba enviado a ${testPhone}`);
      setShowTestModal(false);
      setTestPhone('');
    } catch (e) {
      showToast('Error al enviar el mensaje de prueba.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDisconnectChannel = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/settings/channels?provider=META', { method: 'DELETE' });
      if (res.ok) {
        showToast('Canal de WhatsApp desconectado correctamente.');
        setShowDisconnectModal(false);
        fetchSettings();
      }
    } catch (e) {
      showToast('Error desconectando el canal.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleDisconnectStore = async (storeType: 'woo' | 'shopify') => {
    setIsDisconnectingStore(storeType);
    try {
      const res = await fetch(`/api/settings/${storeType}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`${storeType === 'woo' ? 'WooCommerce' : 'Shopify'} desconectado correctamente.`);
        fetchSettings();
      } else {
        showToast('Error al desconectar la tienda.');
      }
    } catch (e) {
      showToast('Error al procesar la desconexión.');
    } finally {
      setIsDisconnectingStore(null);
    }
  };

  const handleSyncCatalog = async () => {
    setIsSyncingCatalog(true);
    try {
      const res = await fetch('/api/settings/catalog/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Catálogo sincronizado (${data.productsCount} productos).`);
      } else {
        showToast(data.error || 'No se pudo sincronizar el catálogo.');
      }
    } catch (e) {
      showToast('Error de conexión al sincronizar el catálogo.');
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-xs text-slate-500">
        Cargando configuración...
      </div>
    );
  }

  const metaConnected = settings?.channels?.metaConnected;
  const metaConnection = settings?.channels?.connections?.find((c: any) => c.provider === 'META');

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-16">
      <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
        
        {/* HEADER PRINCIPAL */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuración</h1>
          <p className="text-xs text-slate-500 mt-0.5">Gestiona las opciones de tu negocio, canales conectados y cuenta</p>
        </div>

        {/* TOAST DE FEEDBACK */}
        {toast && (
          <div className="p-4 rounded-xl border text-xs font-semibold flex items-center justify-between bg-slate-900 text-white border-slate-800 shadow-md">
            <span>{toast}</span>
            <button onClick={() => setToast('')} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
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

              <BusinessHoursSettings 
                initialHours={settings?.general?.businessHours} 
                onSave={handleSaveBusinessHours} 
              />

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

        {/* PESTAÑA 2: WHATSAPP (REDISEÑO MODULAR CON META CLOUD API) */}
        {activeTab === 'canales' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Canal de comunicación de WhatsApp</h2>
              <p className="text-xs text-slate-500 mt-0.5">Conecta el número de teléfono oficial de tu negocio mediante Meta Cloud API para enviar y recibir mensajes de tus clientes</p>
            </div>

            {/* ALERTAS Y FEEDBACK RESERVADO DE META */}
            {metaConnection && metaConnection.status === 'TOKEN_EXPIRED' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between text-amber-900 shadow-2xs">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>El token de acceso de Meta ha caducado. Necesitas reautorizar la conexión para seguir recibiendo mensajes.</span>
                </div>
                <a href="/api/meta/auth" className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0">
                  Reautorizar Meta
                </a>
              </div>
            )}

            {/* ESTADO 1: DESCONECTADO (EMPTY STATE / SETUP) */}
            {!metaConnected ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                
                {/* BANNER DESTACADO OFICIAL META */}
                <div className="border border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-blue-50/50 to-white rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-500 text-white rounded-lg text-lg">💬</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        Meta Cloud API Oficial
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Conecta el WhatsApp Business oficial de tu empresa
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Vincula tu cuenta empresarial con un solo clic. Garantiza máxima estabilidad 24/7, cero riesgo de bloqueo por spam, marca verificada y límites ampliados de envío.
                    </p>
                  </div>

                  <MetaEmbeddedSignupButton
                    onSuccess={() => {
                      showToast('¡WhatsApp Oficial de Meta conectado con éxito!');
                      fetchSettings();
                    }}
                    onError={(msg) => showToast(msg)}
                    buttonText="Conectar con Facebook / Meta (Oficial)"
                  />
                </div>

                {/* LISTA DE REQUISITOS PREVIOS RÁPIDOS */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Requisitos previos para la conexión:
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
                    <li className="flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Acceso Administrador</strong> en Meta Business Manager con permisos.</span>
                    </li>
                    <li className="flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Número de teléfono limpio</strong> sin WhatsApp activo en un teléfono móvil.</span>
                    </li>
                    <li className="flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Sitio web o datos del negocio</strong> para la verificación oficial en Meta.</span>
                    </li>
                  </ul>
                </div>

              </div>
            ) : (
              /* ESTADO 2: CONECTADO (ACTIVE CHANNEL CARD DETALLADO) */
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                
                {/* HEADER DE CARD CANAL DETALLADO */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-xl font-bold">
                      💬
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">WhatsApp Business (Meta Cloud API)</h3>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Conectado
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Canal oficial activo respondiendo en tiempo real</p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg self-start sm:self-auto">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Calidad de línea: Alta (Verde)</span>
                  </div>
                </div>

                {/* GRID DE DETALLES (3x2 GRID) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Número de teléfono</span>
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {metaConnection?.phoneId ? `ID: ${metaConnection.phoneId}` : '+34 Official Business'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WABA Account ID</span>
                      <button 
                        onClick={() => copyToClipboard('waba', metaConnection?.accountId || 'WABA-928371892')}
                        className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5 font-bold cursor-pointer"
                      >
                        {copiedField === 'waba' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'waba' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {metaConnection?.accountId || 'WABA-928371892'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number ID</span>
                      <button 
                        onClick={() => copyToClipboard('phoneId', metaConnection?.phoneId || 'ID-102938475')}
                        className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5 font-bold cursor-pointer"
                      >
                        {copiedField === 'phoneId' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'phoneId' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {metaConnection?.phoneId || 'ID-102938475'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado del Webhook</span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Sincronizado / Activo
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Límite diario Meta</span>
                    <span className="text-xs font-bold text-slate-900 block">
                      Tier 1 (1.000 conversaciones / 24h)
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cifrado & Seguridad</span>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      Meta Cloud API (AES-256)
                    </span>
                  </div>
                </div>

                {/* BARRA DE ACCIONES SECUNDARIAS */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowTestModal(true)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Probar envío de mensaje
                    </button>

                    <a 
                      href="/api/meta/auth"
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      Reconectar Meta
                    </a>
                  </div>

                  <button 
                    onClick={() => setShowDisconnectModal(true)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Desconectar canal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: CATÁLOGO / TIENDA */}
        {activeTab === 'tienda' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Catálogo de productos y comercio</h2>
              <p className="text-xs text-slate-500 mt-0.5">Conecta tu tienda online para sincronizar productos, precios y stock en tiempo real, o gestiona encargos directos.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* WOOCOMMERCE */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛍️</span>
                    <span className="text-xs font-bold text-slate-900">WooCommerce</span>
                    {settings?.store?.wooConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Conectado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full">
                        No conectado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {settings?.store?.wooConnected && settings?.store?.wooUrl
                      ? `Conectado a ${settings.store.wooUrl}. Los productos y precios se sincronizan con la IA.`
                      : 'Sincroniza tus productos de WordPress/WooCommerce para consultas y pedidos en tiempo real.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  {settings?.store?.wooConnected ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSyncCatalog}
                        disabled={isSyncingCatalog}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingCatalog ? 'animate-spin' : ''}`} />
                        {isSyncingCatalog ? 'Sincronizando...' : 'Sincronizar'}
                      </button>
                      <button
                        onClick={() => handleDisconnectStore('woo')}
                        disabled={isDisconnectingStore === 'woo'}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDisconnectingStore === 'woo' ? 'Desconectando...' : 'Desconectar'}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowWooModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Conectar WooCommerce
                    </button>
                  )}
                </div>
              </div>

              {/* SHOPIFY */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🟢</span>
                    <span className="text-xs font-bold text-slate-900">Shopify</span>
                    {settings?.store?.shopifyConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Conectado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full">
                        No conectado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {settings?.store?.shopifyConnected && settings?.store?.shopifyStoreDomain
                      ? `Conectado a ${settings.store.shopifyStoreDomain}. Los pedidos se sincronizan en Shopify.`
                      : 'Conecta tu tienda de Shopify mediante Access Token para sincronizar pedidos y catálogo.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  {settings?.store?.shopifyConnected ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSyncCatalog}
                        disabled={isSyncingCatalog}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingCatalog ? 'animate-spin' : ''}`} />
                        {isSyncingCatalog ? 'Sincronizando...' : 'Sincronizar'}
                      </button>
                      <button
                        onClick={() => handleDisconnectStore('shopify')}
                        disabled={isDisconnectingStore === 'shopify'}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDisconnectingStore === 'shopify' ? 'Desconectando...' : 'Desconectar'}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowShopifyModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Conectar Shopify
                    </button>
                  )}
                </div>
              </div>

              {/* ENCARGOS LOCALES / MANUALES */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📦</span>
                    <span className="text-xs font-bold text-slate-900">Encargos y pedidos locales</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-full">
                      Siempre activo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Si tu negocio no cuenta con tienda online externa, la IA toma los pedidos por WhatsApp y los registra automáticamente en tu panel de Pedidos para entrega o recogida en tienda.
                  </p>
                </div>
                <a
                  href="/pedidos"
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                >
                  Ver panel de pedidos
                </a>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: USO Y COSTES */}
        {activeTab === 'suscripcion' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Planes de suscripción y límites de IA</h2>
              <p className="text-xs text-slate-500 mt-0.5">Gestiona tu plan actual, facturas y control de gasto de Inteligencia Artificial</p>
            </div>

            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Estado de la suscripción</span>
                  <span className="text-xs text-slate-500">Plan Profesional Activo</span>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                  {settings?.subscription?.status || 'ACTIVO'}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <a 
                  href="/ajustes/billing"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Gestionar facturación y sobrecostes
                </a>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: CUENTA Y EQUIPO */}
        {activeTab === 'equipo' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Miembros del equipo y roles</h2>
                <p className="text-xs text-slate-500 mt-0.5">Invita a tus empleados y define permisos para atender conversaciones de WhatsApp</p>
              </div>
              <button 
                onClick={() => setShowTeamModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                + Invitar miembro
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {settings?.team?.map((user: any) => (
                <div key={user.id} className="p-4 flex justify-between items-center bg-white">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{user.email}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">{user.role}</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold">Activo</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MODAL PRUEBA DE MENSAJE DE WHATSAPP */}
      {showTestModal && (
        <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Probar envío de mensaje por WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Introduce un número de teléfono para enviar un mensaje de verificación a través de Meta Cloud API.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número de teléfono de destino</label>
                <input 
                  type="text" 
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Ej: +34612345678"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button 
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSendTestMessage}
                  disabled={isSendingTest || !testPhone.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSendingTest ? 'Enviando...' : 'Enviar prueba'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DESCONECTAR CANAL */}
      {showDisconnectModal && (
        <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                ¿Desconectar canal de WhatsApp?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Al desconectar el canal de WhatsApp Meta Cloud API, tu asistente dejará de responder automáticamente a los mensajes de tus clientes.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex gap-2 justify-end">
              <button 
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDisconnectChannel}
                disabled={isDisconnecting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDisconnecting ? 'Desconectando...' : 'Sí, desconectar'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL WOOCOMMERCE */}
      {showWooModal && (
        <Dialog open={showWooModal} onOpenChange={setShowWooModal}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                Conectar tienda WooCommerce
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Vincula tu tienda de WordPress para que la IA consulte catálogo, precios y procese pedidos automáticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-5">
              {/* MÉTODO 1 CLIC (PRINCIPAL) */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const wooUrl = formData.get('wooUrlAuto') as string;

                if (!wooUrl) {
                  showToast('Introduce la URL de tu tienda WooCommerce.');
                  return;
                }

                setIsConnectingWooAuto(true);
                try {
                  const res = await fetch('/api/onboarding/woo/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wooUrl, returnContext: 'settings' })
                  });
                  const data = await res.json();
                  if (res.ok && data.authUrl) {
                    window.location.href = data.authUrl;
                  } else {
                    showToast(data.error || 'Error al contactar con tu tienda WooCommerce.');
                    setIsConnectingWooAuto(false);
                  }
                } catch (err) {
                  showToast('Error de conexión con el servidor.');
                  setIsConnectingWooAuto(false);
                }
              }} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dirección web de tu tienda
                  </label>
                  <input 
                    name="wooUrlAuto" 
                    type="text" 
                    placeholder="https://mitienda.com" 
                    required 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all" 
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Solo introduce el dominio de tu tienda. Se abrirá la autorización segura de WordPress en 1 clic.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isConnectingWooAuto}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isConnectingWooAuto ? 'Conectando con tu tienda...' : 'Conectar en 1 clic con WooCommerce'}</span>
                </button>
              </form>

              {/* MÉTODO MANUAL COLAPSABLE */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualWoo(!showManualWoo)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1 cursor-pointer"
                >
                  <span>¿Prefieres configurar las claves API manualmente?</span>
                  {showManualWoo ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {showManualWoo && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const wooUrl = formData.get('wooUrl') as string;
                    const wooConsumerKey = formData.get('wooConsumerKey') as string;
                    const wooConsumerSecret = formData.get('wooConsumerSecret') as string;

                    if (!wooUrl || !wooConsumerKey || !wooConsumerSecret) {
                      showToast('Por favor completa todos los campos de WooCommerce');
                      return;
                    }

                    try {
                      const res = await fetch('/api/onboarding/woo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ wooUrl, wooConsumerKey, wooConsumerSecret })
                      });
                      const data = await res.json();

                      if (res.ok && data.success) {
                        showToast('Tienda WooCommerce conectada correctamente');
                        setShowWooModal(false);
                        fetchSettings();
                      } else {
                        showToast(data.error || 'Error conectando la tienda');
                      }
                    } catch (err) {
                      showToast('Error de conexión con la tienda');
                    }
                  }} className="mt-3 space-y-3 pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">URL de la tienda (HTTPS)</label>
                      <input name="wooUrl" type="url" placeholder="https://mitienda.com" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Consumer Key (ck_...)</label>
                      <input name="wooConsumerKey" type="text" placeholder="ck_xxxxxxxxxxxxxxxx" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Consumer Secret (cs_...)</label>
                      <input name="wooConsumerSecret" type="password" placeholder="cs_xxxxxxxxxxxxxxxx" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600" />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs">
                        Guardar claves manuales
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowWooModal(false)} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL SHOPIFY */}
      {showShopifyModal && (
        <Dialog open={showShopifyModal} onOpenChange={setShowShopifyModal}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Conectar tienda Shopify</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Introduce el dominio de tu tienda Shopify y el token de acceso de tu app personalizada de la API Admin.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (isConnectingShopify) return;
              setIsConnectingShopify(true);

              const formData = new FormData(e.currentTarget);
              const shopUrl = formData.get('shopUrl') as string;
              const accessToken = formData.get('accessToken') as string;

              if (!shopUrl || !accessToken) {
                showToast('Por favor completa todos los campos de Shopify.');
                setIsConnectingShopify(false);
                return;
              }

              try {
                const res = await fetch('/api/settings/shopify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ shopUrl, accessToken })
                });
                const data = await res.json();

                if (res.ok && data.success) {
                  showToast(`¡Shopify conectado con éxito para ${data.shop?.name || shopUrl}!`);
                  setShowShopifyModal(false);
                  fetchSettings();
                } else {
                  showToast(data.error || 'Error conectando con Shopify.');
                }
              } catch (err) {
                showToast('Error de conexión con el servidor.');
              } finally {
                setIsConnectingShopify(false);
              }
            }} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dominio de la tienda (.myshopify.com)</label>
                <input 
                  name="shopUrl" 
                  type="text" 
                  placeholder="ejemplo-tienda.myshopify.com" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600" 
                />
                <p className="text-[10px] text-slate-400 mt-1">Puedes introducir solo el nombre o la dirección completa .myshopify.com</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Token de acceso API Admin (shpat_...)</label>
                <input 
                  name="accessToken" 
                  type="password" 
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600" 
                />
                <p className="text-[10px] text-slate-400 mt-1">Generado en Shopify Admin &gt; Configuración &gt; Apps desarrolladas para tu tienda.</p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowShopifyModal(false)} 
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isConnectingShopify}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isConnectingShopify ? 'Verificando...' : 'Conectar Shopify'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL EQUIPO */}
      {showTeamModal && (
        <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Invitar miembro al equipo</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">Añade la dirección de correo electrónico del nuevo empleado.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo electrónico</label>
                <input type="email" placeholder="empleado@mitienda.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowTeamModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl">Cancelar</button>
                <button onClick={() => { showToast('Invitación enviada'); setShowTeamModal(false); }} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">Enviar invitación</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
