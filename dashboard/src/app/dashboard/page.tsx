"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { 
  MessageSquare, CheckCircle2, Clock, Sparkles, Zap, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { OnboardingWidget } from '@/components/OnboardingWidget';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingInsight, setResolvingInsight] = useState<string | null>(null);
  const [period, setPeriod] = useState('7d');

  const fetchMetrics = () => {
    setLoading(true);
    fetch(`/api/metrics?period=${period}`)
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching metrics', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const handleResolveInsight = async (insight: any) => {
    setResolvingInsight(insight.id);
    try {
      const res = await fetch('/api/insights/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          insightId: insight.id, 
          action: insight.actionLabel === 'Añadir política' ? 'CREATE_KNOWLEDGE' : 'DISMISS' 
        })
      });
      if (res.ok) {
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
    }
    setResolvingInsight(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-slate-500 text-xs font-semibold">Cargando estado de tu asistente...</p>
        </div>
      </div>
    );
  }

  if (!metrics || metrics.error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="text-center bg-white border border-slate-200 p-8 rounded-xl max-w-md shadow-sm">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-slate-900 font-bold mb-1">No hemos podido cargar la información.</p>
          <p className="text-slate-500 text-xs mb-4">Revisa tu conexión a internet o intenta actualizar la página.</p>
          <button 
            onClick={fetchMetrics} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const isWorking = metrics.assistantStatus?.isWorking || metrics.totalConversations > 0;
  const hasEnoughDataForChart = metrics.totalConversations > 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-16">
      <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
        
        {/* HEADER PRINCIPAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inicio</h1>
            <p className="text-xs text-slate-500 mt-0.5">Supervisa el estado y rendimiento de tu asistente virtual</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none shadow-xs cursor-pointer focus:border-blue-600"
            >
              <option value="today">Hoy</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="all">Todo el tiempo</option>
            </select>

            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              isWorking 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                : 'bg-amber-50 text-amber-700 border-amber-200/80'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isWorking ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{isWorking ? 'Asistente activo' : 'Configuración pendiente'}</span>
            </div>
          </div>
        </div>

        {/* HERO / RESUMEN SUPERIOR (NIVEL 1: ¿Está funcionando?) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {isWorking ? 'Tu asistente está funcionando' : 'Tu asistente está casi listo'}
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              {metrics.totalConversations > 0 ? (
                <>
                  Ha atendido <strong className="text-slate-900 font-semibold">{metrics.totalConversations} conversaciones</strong> esta semana y ha resuelto automáticamente el <strong className="text-emerald-600 font-semibold">{metrics.automationRate}%</strong>.
                </>
              ) : (
                'Completa la configuración para que tu asistente comience a responder a tus clientes automáticamente.'
              )}
            </p>
          </div>

          {!metrics.assistantStatus?.onboardingCompleted && (
            <Link 
              href="/ajustes" 
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap active:scale-95 cursor-pointer"
            >
              Completar configuración
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* CHECKLIST VISUAL DE CONFIGURACIÓN */}
        <OnboardingWidget />

        {/* KPIs PRINCIPALES (NIVEL 3: Máximo 4 tarjetas súper limpias) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Conversaciones Atendidas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Conversaciones atendidas</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
              {metrics.totalConversations}
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Atendidas esta semana</p>
          </div>

          {/* KPI 2: Consultas Resueltas Automáticamente */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Consultas resueltas</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
              {metrics.aiResolvedConversations}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium">
              {metrics.automationRate}% resueltas automáticamente
            </p>
          </div>

          {/* KPI 3: Tiempo Ahorrado */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Tiempo ahorrado</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
              {metrics.timeSavedFormatted || '0 min'}
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Estimación esta semana</p>
          </div>

          {/* KPI 4: Oportunidades Detectadas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Oportunidades detectadas</span>
              <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
              {metrics.insights?.length || 0}
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Sugerencias para tu negocio</p>
          </div>

        </div>

        {/* OPORTUNIDADES PARA TU NEGOCIO (INSIGHTS ACCIONABLES - NIVEL 4) */}
        {metrics.insights && metrics.insights.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <h3 className="text-sm font-bold text-slate-900">Oportunidades para tu negocio</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.insights.map((insight: any) => (
                <div 
                  key={insight.id} 
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-1.5 mb-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                      <span>{insight.title}</span>
                      <span className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">Sugerencia</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      {insight.description}
                    </p>
                  </div>

                  {insight.actionLabel && (
                    <button 
                      onClick={() => handleResolveInsight(insight)}
                      disabled={resolvingInsight === insight.id}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer self-start"
                    >
                      {resolvingInsight === insight.id ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                      )}
                      {resolvingInsight === insight.id ? 'Guardando...' : insight.actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GRID DE DOS COLUMNAS: ESTADO DEL ASISTENTE + ACTIVIDAD RECIENTE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TARJETA 1: ESTADO DEL ASISTENTE (NIVEL 2) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Estado del asistente</h3>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  metrics.assistantStatus?.isWorking 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${metrics.assistantStatus?.isWorking ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {metrics.assistantStatus?.isWorking ? 'Funcionando correctamente' : 'Requiere atención'}
                </span>
              </div>

              <div className="space-y-3 divide-y divide-slate-100 text-xs">
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">WhatsApp</span>
                  <span className={`font-semibold flex items-center gap-1.5 ${metrics.assistantStatus?.waConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${metrics.assistantStatus?.waConnected ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    {metrics.assistantStatus?.waConnected ? 'Conectado' : 'No conectado'}
                  </span>
                </div>

                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Información del negocio</span>
                  <span className={`font-semibold flex items-center gap-1.5 ${metrics.assistantStatus?.hasKnowledge ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${metrics.assistantStatus?.hasKnowledge ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {metrics.assistantStatus?.hasKnowledge ? `${metrics.assistantStatus.knowledgeCount} documentos cargados` : 'Sin información'}
                  </span>
                </div>

                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Catálogo de productos</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Actualizado
                  </span>
                </div>

                <div className="pt-3 flex justify-between items-center text-slate-500">
                  <span>Última actividad</span>
                  <span className="font-medium text-slate-700">
                    {metrics.assistantStatus?.lastActivityAt 
                      ? new Date(metrics.assistantStatus.lastActivityAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) 
                      : 'Sin actividad reciente'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">¿Quieres ajustar cómo responde tu asistente?</span>
              <Link href="/cerebro" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Editar información →
              </Link>
            </div>
          </div>

          {/* TARJETA 2: ACTIVIDAD RECIENTE (LIVE FEED) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
                <span className="text-[11px] font-semibold text-slate-400">Tiempo real</span>
              </div>

              {metrics.recentActivity && metrics.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {metrics.recentActivity.map((act: any) => (
                    <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        act.type === 'ai' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-medium truncate">{act.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{act.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 space-y-2 bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Todavía no tienes conversaciones recientes</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Cuando tus clientes empiecen a escribir por WhatsApp, verás la actividad en tiempo real aquí.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">¿Quieres ver todos los chats?</span>
              <Link href="/conversaciones" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Ir a Conversaciones →
              </Link>
            </div>
          </div>

        </div>

        {/* NIVEL 6: GRÁFICA SIMPLIFICADA DE TENDENCIA */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Evolución de consultas</h3>
              <p className="text-xs text-slate-500">Comparativa de conversaciones totales vs resueltas por IA</p>
            </div>
            {hasEnoughDataForChart && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span className="font-medium text-slate-600">Resueltas por IA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                  <span className="font-medium text-slate-600">Total consultas</span>
                </div>
              </div>
            )}
          </div>

          {!hasEnoughDataForChart ? (
            <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-lg p-6 space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Todavía no hay suficientes conversaciones para mostrar tendencias</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cuando tu asistente empiece a recibir mensajes en WhatsApp podrás ver cómo evoluciona la automatización día a día.
              </p>
            </div>
          ) : (
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAiBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', backgroundColor: '#ffffff' }}
                    labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#cbd5e1" fill="transparent" strokeWidth={2} name="Total consultas" />
                  <Area type="monotone" dataKey="ai" stroke="#2563eb" fill="url(#colorAiBlue)" strokeWidth={2.5} name="Resueltas por IA" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
