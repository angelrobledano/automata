"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '@/lib/analytics';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';

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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border-2 border-indigo-100 rounded-lg p-6 md:p-8 mb-8 shadow-none relative overflow-hidden"
      >
        {isComplete && (
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-muted-foreground focus:outline-none"
            aria-label="Cerrar widget"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          
          {/* Progress Indicator */}
          <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <motion.path 
                className="text-primary" 
                strokeWidth="4" 
                stroke="currentColor" 
                fill="none" 
                strokeLinecap="round" 
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${status.progress}, 100` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              {isComplete ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </motion.div>
              ) : (
                <span className="text-xl font-extrabold text-indigo-700">{status.progress}%</span>
              )}
            </div>
          </div>

          <div className="flex-1 w-full">
            <h2 className="text-xl font-bold text-foreground mb-2">
              {isComplete ? '¡Enhorabuena! Asistente configurado al 100%' : '¡Tu asistente necesita entrenamiento!'}
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              {isComplete 
                ? 'Has completado todos los pasos clave. Tu IA está lista para atender clientes y generar ventas.'
                : 'Completa estos 3 sencillos pasos para desbloquear todo el potencial de la IA y empezar a automatizar tu negocio en piloto automático.'}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Step 1 */}
              <Link 
                href="/cerebro" 
                onClick={() => handleStepClick('knowledge')}
                className={`flex flex-col p-4 rounded-lg border relative transition-all group ${
                  status.steps.knowledge ? 'bg-green-50/50 border-green-200 opacity-80 hover:opacity-100' : 'bg-card border-border hover:border-indigo-400 hover:shadow-none cursor-pointer'
                }`}
              >
                {status.steps.knowledge && <div className="absolute top-3 right-3 text-green-500"><CheckCircle2 className="w-5 h-5" /></div>}
                <div className="text-2xl mb-2 grayscale-0 transition-all">🧠</div>
                <h3 className={`text-sm font-bold ${status.steps.knowledge ? 'text-green-800' : 'text-foreground'}`}>1. Sube Conocimiento</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3 flex-1">Añade políticas o PDFs al cerebro.</p>
                {!status.steps.knowledge && (
                  <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Configurar <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </Link>

              {/* Step 2 */}
              <Link 
                href="/ajustes?tab=tienda" 
                onClick={() => handleStepClick('ecommerce')}
                className={`flex flex-col p-4 rounded-lg border relative transition-all group ${
                  status.steps.ecommerce ? 'bg-green-50/50 border-green-200 opacity-80 hover:opacity-100' : 'bg-card border-border hover:border-indigo-400 hover:shadow-none cursor-pointer'
                }`}
              >
                {status.steps.ecommerce && <div className="absolute top-3 right-3 text-green-500"><CheckCircle2 className="w-5 h-5" /></div>}
                <div className="text-2xl mb-2">🛍️</div>
                <h3 className={`text-sm font-bold ${status.steps.ecommerce ? 'text-green-800' : 'text-foreground'}`}>2. Conecta Catálogo</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3 flex-1">Permite que recomiende productos.</p>
                {!status.steps.ecommerce && (
                  <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Configurar <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </Link>

              {/* Step 3 */}
              <Link 
                href="/ajustes?tab=canales" 
                onClick={() => handleStepClick('whatsapp')}
                className={`flex flex-col p-4 rounded-lg border relative transition-all group ${
                  status.steps.whatsapp ? 'bg-green-50/50 border-green-200 opacity-80 hover:opacity-100' : 'bg-card border-border hover:border-indigo-400 hover:shadow-none cursor-pointer'
                }`}
              >
                {status.steps.whatsapp && <div className="absolute top-3 right-3 text-green-500"><CheckCircle2 className="w-5 h-5" /></div>}
                <div className="text-2xl mb-2">💬</div>
                <h3 className={`text-sm font-bold ${status.steps.whatsapp ? 'text-green-800' : 'text-foreground'}`}>3. Activa WhatsApp</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3 flex-1">Vincula tu número de negocio.</p>
                {!status.steps.whatsapp && (
                  <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Configurar <ChevronRight className="w-3 h-3" />
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
