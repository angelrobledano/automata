"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '@/lib/analytics';
import { CheckCircle2, ArrowRight, X, Sparkles } from 'lucide-react';

interface OnboardingStatus {
  progress: number;
  steps: {
    knowledge: boolean;
    ecommerce: boolean;
    whatsapp: boolean;
  };
}

export function OnboardingWidget() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboardingDismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (dismissed) return;

    fetch('/api/onboarding/status')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStatus(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('onboardingDismissed', 'true');
    setDismissed(true);
  };

  const handleStepClick = (stepName: string) => {
    analytics.track('onboarding_step_completed', { step_name: stepName });
  };

  if (loading || dismissed || !status) return null;

  const isComplete = status.progress === 100;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 mb-6 shadow-sm relative overflow-hidden"
      >
        {isComplete && (
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            aria-label="Cerrar widget"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* Progress Circle */}
          <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <motion.path 
                className="text-blue-600" 
                strokeWidth="4" 
                stroke="currentColor" 
                fill="none" 
                strokeLinecap="round" 
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${status.progress}, 100` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              {isComplete ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <span className="text-sm font-bold text-slate-900">{status.progress}%</span>
              )}
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-slate-900">
                {isComplete ? '¡Tu asistente está 100% preparado!' : 'Pon tu asistente a trabajar'}
              </h2>
            </div>
            <p className="text-slate-500 mb-4 text-xs leading-relaxed">
              {isComplete 
                ? 'Has completado los pasos de puesta en marcha. Tu asistente responderá a tus clientes al instante.'
                : 'Completa estos pasos sencillos para que tu asistente conozca tu negocio y pueda atender consultas.'}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* Step 1 */}
              <Link 
                href="/cerebro" 
                onClick={() => handleStepClick('knowledge')}
                className={`flex flex-col p-3.5 rounded-lg border transition-all ${
                  status.steps.knowledge 
                    ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-900' 
                    : 'bg-slate-50/50 border-slate-200 hover:border-blue-300 hover:bg-white cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">1. Información del negocio</span>
                  {status.steps.knowledge ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Pendiente</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-2">Añade horarios, preguntas frecuentes o PDFs.</p>
                {!status.steps.knowledge && (
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-auto">
                    Añadir información <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </Link>

              {/* Step 2 */}
              <Link 
                href="/ajustes?tab=tienda" 
                onClick={() => handleStepClick('ecommerce')}
                className={`flex flex-col p-3.5 rounded-lg border transition-all ${
                  status.steps.ecommerce 
                    ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-900' 
                    : 'bg-slate-50/50 border-slate-200 hover:border-blue-300 hover:bg-white cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">2. Conecta tus productos</span>
                  {status.steps.ecommerce ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Pendiente</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-2">Permite al asistente recomendar tu catálogo.</p>
                {!status.steps.ecommerce && (
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-auto">
                    Conectar catálogo <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </Link>

              {/* Step 3 */}
              <Link 
                href="/ajustes?tab=canales" 
                onClick={() => handleStepClick('whatsapp')}
                className={`flex flex-col p-3.5 rounded-lg border transition-all ${
                  status.steps.whatsapp 
                    ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-900' 
                    : 'bg-slate-50/50 border-slate-200 hover:border-blue-300 hover:bg-white cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">3. Conecta WhatsApp</span>
                  {status.steps.whatsapp ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Pendiente</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-2">Vincula tu número de negocio mediante QR.</p>
                {!status.steps.whatsapp && (
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-auto">
                    Conectar WhatsApp <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </Link>

            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
