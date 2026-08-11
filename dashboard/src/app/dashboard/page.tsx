"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { 
  MessageSquare, CheckCircle2, Clock, Sparkles, Zap, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, Layers, ExternalLink, Activity, Info
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

  // Datos mock para gráfica skeleton cuando no hay suficientes conversaciones
  const dummyChartData = [
    { date: 'Lun', total: 4, ai: 3 },
    { date: 'Mar', total: 7, ai: 6 },
    { date: 'Mié', total: 5, ai: 5 },
    { date: 'Jue', total: 9, ai: 8 },
    { date: 'Vie', total: 12, ai: 11 },
    { date: 'Sáb', total: 8, ai: 7 },
    { date: 'Dom', total: 6, ai: 6 },
  ];

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

        {/* 1. HERO SECTION: UNIFICACIÓN DE ONBOARDING (BARRA DE PROGRESO + STEPPER 3 PASOS) */}
        <OnboardingWidget />

        {/* 2. BLOQUE DE OPORTUNIDADES Y VALOR (ELEVACIÓN DE JERARQUÍA JUSTO DEBAJO DE ONBOARDING) */}
        {metrics.insights && metrics.insights.length > 0 ? (
          <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white border border-indigo-100 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Oportunidades de mejora detectadas por la IA
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.insights.map((insight: any) => (
                <div 
                  key={insight.id} 
                  className="bg-white border border-indigo-100/80 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{insight.title}</h4>
                      <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full shrink-0">
                        Sugerencia IA
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {insight.description}
                    </p>
                  </div>

                  {insight.actionLabel && (
                    <button 
                      onClick={() => handleResolveInsight(insight)}
                      disabled={resolvingInsight === insight.id}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer self-start shadow-2xs"
                    >
                      {resolvingInsight === insight.id ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      {resolvingInsight === insight.id ? 'Guardando...' : insight.actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Sugerencia rápida: Añade políticas de devolución o preguntas frecuentes para que la IA responda al instante.</span>
            </div>
            <Link href="/cerebro" className="px-3 py-1 bg-white border border-slate-200 text-blue-600 font-bold rounded-lg hover:bg-slate-100 transition-colors shrink-0">
              Añadir política →
            </Link>
          </div>
        )}

        {/* 3. REDISEÑO DE KPIS (ZERO STATES OPTIMIZADOS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Conversaciones Atendidas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Conversaciones atendidas</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
              {metrics.totalConversations}
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              {metrics.totalConversations > 0 ? 'Atendidas esta semana' : 'Aparecerá al recibir tu primer mensaje'}
            </p>
          </div>

          {/* KPI 2: Consultas Resueltas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors">
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
              {metrics.totalConversations > 0 ? `${metrics.automationRate}% resueltas automáticamente` : 'Resueltas automáticamente por la IA'}
            </p>
          </div>

          {/* KPI 3: Tiempo Ahorrado */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Tiempo ahorrado</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
              {metrics.timeSavedFormatted || '0 min'}
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              {metrics.totalConversations > 0 ? 'Estimación esta semana' : 'Estimación según mensajes atendidos'}
            </p>
          </div>

          {/* KPI 4: Oportunidades Detectadas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Oportunidades detectadas</span>
              <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
              {metrics.insights?.length || 0}
            </div>
            <p className="text-[11px] text-slate-400 font-normal">Sugerencias automáticas de mejora</p>
          </div>

        </div>

        {/* 4. LAYOUT INFERIOR PARALELO (GRID 2 COLUMNAS DE IGUAL ALTURA) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* COLUMNA IZQUIERDA: ESTADO DEL ASISTENTE */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Estado del asistente</h3>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  metrics.assistantStatus?.isWorking 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${metrics.assistantStatus?.isWorking ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  {metrics.assistantStatus?.isWorking ? 'Funcionando correctamente' : 'Requiere atención'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <span className="text-slate-800 font-bold">WhatsApp Business (Meta)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-[11px] flex items-center gap-1.5 ${metrics.assistantStatus?.waConnected ? 'text-emerald-700' : 'text-rose-700'}`}>
                      <span className={`w-2 h-2 rounded-full ${metrics.assistantStatus?.waConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {metrics.assistantStatus?.waConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                    <Link href="/ajustes?tab=canales" className="text-blue-600 hover:underline font-bold text-[11px]">
                      Gestionar
                    </Link>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏢</span>
                    <span className="text-slate-800 font-bold">Información del negocio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-[11px] flex items-center gap-1.5 ${metrics.assistantStatus?.hasKnowledge ? 'text-emerald-700' : 'text-amber-700'}`}>
                      <span className={`w-2 h-2 rounded-full ${metrics.assistantStatus?.hasKnowledge ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      {metrics.assistantStatus?.hasKnowledge ? `${metrics.assistantStatus.knowledgeCount} fragmentos` : 'Sin datos'}
                    </span>
                    <Link href="/cerebro" className="text-blue-600 hover:underline font-bold text-[11px]">
                      Editar
                    </Link>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛍️</span>
                    <span className="text-slate-800 font-bold">Catálogo de productos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px] text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Sincronizado
                    </span>
                    <Link href="/ajustes?tab=tienda" className="text-blue-600 hover:underline font-bold text-[11px]">
                      Ver catálogo
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">¿Quieres personalizar el comportamiento?</span>
              <Link href="/cerebro" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Ver conocimiento →
              </Link>
            </div>
          </div>

          {/* COLUMNA DERECHA: ACTIVIDAD RECIENTE (PADDING VERTICAL OPTIMIZADO) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-blue-600" />
                  En tiempo real
                </span>
              </div>

              {metrics.recentActivity && metrics.recentActivity.length > 0 ? (
                <div className="space-y-2.5">
                  {metrics.recentActivity.map((act: any) => (
                    <div key={act.id} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        act.type === 'ai' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-medium truncate">{act.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{act.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 space-y-1.5 bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <MessageSquare className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700">Todavía no tienes conversaciones recientes</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Cuando tus clientes escriban por WhatsApp, la actividad aparecerá al instante.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">¿Supervisar atención humana?</span>
              <Link href="/conversaciones" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Ir a Conversaciones →
              </Link>
            </div>
          </div>

        </div>

        {/* GRÁFICA DE EVOLUCIÓN CON SKELETON BLUR Y BADGE CUANDO NO HAY SUFICIENTES DATOS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
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

          <div className="relative">
            {!hasEnoughDataForChart && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-xl p-4">
                <Link 
                  href="/ajustes?tab=canales"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
                >
                  <span>📊 Sincroniza WhatsApp para desbloquear analíticas en tiempo real</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                </Link>
              </div>
            )}

            <div className={`h-[180px] w-full pt-2 ${!hasEnoughDataForChart ? 'opacity-30 pointer-events-none' : ''}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hasEnoughDataForChart ? metrics.chartData : dummyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          </div>
        </div>

      </div>
    </div>
  );
}
