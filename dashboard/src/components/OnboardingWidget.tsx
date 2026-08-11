"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { analytics } from '@/lib/analytics';
import { CheckCircle2, ArrowRight, X, Sparkles, MessageSquare, Building2, ShoppingBag } from 'lucide-react';

interface OnboardingStatus {
  progress: number;
  steps: {
    knowledge: boolean;
    ecommerce: boolean;
    whatsapp: boolean;
  };
}

export function OnboardingWidget() {
  const [status, setStatus] = useState<OnboardingStatus | null>({
    progress: 34,
    steps: {
      knowledge: true,
      whatsapp: false,
      ecommerce: false
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then(res => res.json())
      .then(data => {
        if (!data.error && data.progress !== undefined) setStatus(data);
      })
      .catch(err => console.error(err));
  }, []);

  if (!status) return null;

  const currentProgress = status.progress || 34;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      {/* HEADER + PORCENTAJE BARRA LINEAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Pon tu asistente a trabajar</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Completa el proceso de activación de 3 pasos</p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs font-extrabold text-blue-600">{currentProgress}% completado</span>
          <div className="w-28 sm:w-36 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <motion.div 
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${currentProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* STEPPER HORIZONTAL DE 3 PASOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        
        {/* PASO 1: CONFIGURACIÓN INICIAL (COMPLETADO) */}
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
              ✓
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">1. Configuración inicial</span>
              <span className="text-[11px] text-emerald-700 font-semibold">Completado</span>
            </div>
          </div>
        </div>

        {/* PASO 2: CONECTAR WHATSAPP (PASO ACTUAL PENDIENTE - DESTACADO) */}
        <div className="p-3.5 bg-blue-50/70 border-2 border-blue-600 rounded-xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">2. Conectar WhatsApp</span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-md">Paso actual</span>
            </div>
          </div>

          <Link 
            href="/ajustes?tab=canales"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all shrink-0 cursor-pointer flex items-center gap-1"
          >
            <span>Conectar ahora</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* PASO 3: CATÁLOGO E INFORMACIÓN */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 opacity-75">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">3. Catálogo / Información</span>
              <span className="text-[11px] text-slate-400 font-medium">Siguiente paso</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
