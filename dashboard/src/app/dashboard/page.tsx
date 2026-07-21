"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { 
  TrendingUp, Clock, Euro, Users, ArrowUpRight, Zap, Sparkles, MessageSquare, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { motion } from 'framer-motion';
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
        body: JSON.stringify({ insightId: insight.id, action: insight.actionLabel === 'Añadir política' ? 'CREATE_KNOWLEDGE' : 'DISMISS' })
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
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></span>
          <p className="text-muted-foreground font-medium">Calculando el impacto de tu IA...</p>
        </div>
      </div>
    );
  }

  if (!metrics || metrics.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground font-medium mb-2">No hemos podido cargar los datos.</p>
          <p className="text-muted-foreground text-sm">Actualiza la página en unos instantes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-6 font-sans pb-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Resumen de Rendimiento</h1>
          <p className="text-muted-foreground mt-1">Aquí tienes el impacto de tu asistente calculado en tiempo real.</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-card border border-border text-muted-foreground text-sm font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-none cursor-pointer"
          >
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="all">Todo el tiempo</option>
          </select>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100 shadow-none">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-green-700">Asistente Activo</span>
          </div>
        </div>
      </div>

      {/* GAMIFICATION ONBOARDING */}
      <OnboardingWidget />

      {/* INSIGHTS PREDICTIVOS */}
      {metrics?.insights && metrics.insights.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-foreground">Insights Predictivos</h2>
            <span className="bg-primary/20 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">BETA</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.insights.map((insight: any) => (
              <div key={insight.id} className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-lg p-5 shadow-none relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <h3 className="font-bold text-foreground mb-2 relative z-10">{insight.title}</h3>
                <p className="text-sm text-muted-foreground mb-5 relative z-10">{insight.description}</p>
                {insight.actionLabel && (
                  <button 
                    onClick={() => handleResolveInsight(insight)}
                    disabled={resolvingInsight === insight.id}
                    className="relative z-10 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-none flex items-center gap-2"
                  >
                    {resolvingInsight === insight.id ? (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <span>✨</span>
                    )}
                    {resolvingInsight === insight.id ? 'Aplicando...' : insight.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN 1: EL HÉROE EMOCIONAL */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden bg-indigo-900 rounded-lg p-6 mb-6 shadow-xl border border-indigo-800/50"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-300" />
            <h2 className="text-lg font-bold text-white">Lo que tu asistente ha logrado por ti</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-indigo-800/50 backdrop-blur-sm border border-indigo-700/50 hover:border-indigo-500/80 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all rounded-lg p-4 cursor-default"
            >
              <Clock className="w-6 h-6 text-indigo-300 mb-2" />
              <h3 className="text-3xl font-extrabold text-white mb-1">{metrics.hoursSaved} horas</h3>
              <p className="text-indigo-200 text-xs leading-relaxed">
                Recuperadas en total respondiendo automáticamente a {metrics.aiMessages} mensajes de clientes.
              </p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-indigo-800/50 backdrop-blur-sm border border-indigo-700/50 hover:border-amber-500/80 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all rounded-lg p-4 cursor-default"
            >
              <Zap className="w-6 h-6 text-amber-300 mb-2" />
              <h3 className="text-3xl font-extrabold text-white mb-1">{metrics.automationRate}% IA</h3>
              <p className="text-indigo-200 text-xs leading-relaxed">
                Tasa de automatización. Conversaciones resueltas sin que un humano intervenga.
              </p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-indigo-800/50 backdrop-blur-sm border border-indigo-700/50 hover:border-green-400/80 hover:shadow-[0_0_15px_rgba(74,222,128,0.5)] transition-all rounded-lg p-4 cursor-default"
            >
              <Euro className="w-6 h-6 text-green-400 mb-2" />
              <h3 className="text-3xl font-extrabold text-white mb-1">{metrics.totalCost?.toFixed(4) || '0.0000'} €</h3>
              <p className="text-indigo-200 text-xs leading-relaxed">
                Coste exacto de OpenAI consumiendo {metrics.totalTokens || 0} tokens.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* SECCIÓN 2: IMPACTO ECONÓMICO (BENTO BOX) */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Impacto Económico Directo</h3>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        
        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-lg p-5 border border-gray-100 shadow-none hover:shadow-none transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-1 group relative">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 cursor-help">
                Coste de atención evitado
                <span className="text-gray-400 border border-gray-300 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">?</span>
              </p>
              <div className="absolute top-6 left-0 bg-gray-900 text-white text-xs p-3 rounded-lg w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl">
                Se calcula asumiendo que cada respuesta del bot ahorra 2 minutos de trabajo a un agente humano, multiplicado por un salario base de 15€/hora.
              </div>
            </div>
            <h4 className="text-4xl font-extrabold text-foreground tracking-tight mb-1">{metrics.moneySaved} €</h4>
            <p className="text-[10px] text-muted-foreground">Basado en un coste operativo de 15€/hora.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50">
            <p className="text-xs text-muted-foreground font-medium">El valor del tiempo que tu equipo ahorró en teclear.</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-lg p-5 border border-gray-100 shadow-none hover:shadow-none transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] opacity-5">
            <Zap className="w-32 h-32 text-primary" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1 group relative">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 cursor-help">
                Tasa de Automatización
                <span className="text-gray-400 border border-gray-300 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">?</span>
              </p>
              <div className="absolute top-6 left-0 bg-gray-900 text-white text-xs p-3 rounded-lg w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl">
                El porcentaje de chats totales en los que el cliente fue atendido exitosamente de principio a fin sin pedir hablar con un humano.
              </div>
            </div>
            <h4 className="text-4xl font-extrabold text-primary tracking-tight mb-1">{metrics.automationRate}%</h4>
            <p className="text-[10px] text-muted-foreground">De {metrics.totalConversations} conversaciones totales.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 relative z-10">
            <p className="text-xs text-muted-foreground font-medium">Clientes que no necesitaron ayuda de un humano.</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-lg p-5 border border-gray-100 shadow-none hover:shadow-none transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-1 group relative">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 cursor-help">
                Ventas estimadas por IA 
                <span className="text-gray-400 border border-gray-300 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">?</span>
              </p>
              <div className="absolute top-6 left-0 bg-gray-900 text-white text-xs p-3 rounded-lg w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl">
                Se calcula asumiendo una conversión media de 12.5€ por cada consulta resuelta de manera exitosa sin intervención humana, basándose en la tasa de cierre habitual del sector.
              </div>
            </div>
            <h4 className="text-4xl font-extrabold text-foreground tracking-tight mb-1">{metrics.salesGenerated} €</h4>
            <p className="text-[10px] text-muted-foreground">Basado en {metrics.aiResolvedConversations} chats resueltos.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50">
            <p className="text-xs text-muted-foreground font-medium">Valor retenido por responder al instante.</p>
          </div>
        </motion.div>

      </motion.div>

      {/* SECCIÓN 4: GRÁFICOS Y RENDIMIENTO OPERATIVO */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Rendimiento Operativo</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Gráfico de Área */}
        <div className="lg:col-span-2 bg-card rounded-lg p-5 border border-gray-100 shadow-none">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Volumen de Mensajes (Últimos 7 días)</h4>
              <p className="text-[10px] text-muted-foreground">Mensajes recibidos vs respondidos por IA.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-200"></span>
                <span className="text-[10px] font-medium text-muted-foreground">Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span className="text-[10px] font-medium text-muted-foreground">Por IA</span>
              </div>
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="total" stroke="#c7d2fe" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="ai" stroke="#4f46e5" fill="url(#colorAi)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Canales y Salud */}
        <div className="bg-card rounded-lg p-5 border border-gray-100 shadow-none flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4">Salud del Asistente</h4>
            
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Sin humano</span>
                <span className="font-bold">{metrics.automationRate}%</span>
              </div>
              <div className="w-full bg-card h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: `${metrics.automationRate}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> WhatsApp</span>
                <span className="font-bold">{metrics.totalConversations} chats</span>
              </div>
              <div className="w-full bg-card h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-background rounded-lg p-3 border border-gray-100 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Tiempo de Respuesta IA</p>
            <p className="text-lg font-extrabold text-foreground">1.2 seg</p>
            <p className="text-[9px] text-green-600 font-semibold mt-0.5">35x más rápido que un humano</p>
          </div>
        </div>

      </div>

    </div>
  );
}
