"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function ConsolidatedStatusBar({
  whatsappDisconnected,
  woocommerceIssue,
}: {
  whatsappDisconnected?: boolean;
  woocommerceIssue?: boolean;
}) {
  const [isWaConnected, setIsWaConnected] = useState<boolean>(true);
  const [isWooConnected, setIsWooConnected] = useState<boolean>(false);
  const [dismissedWa, setDismissedWa] = useState(false);
  const [dismissedWoo, setDismissedWoo] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings?.channels) {
          setIsWaConnected(!!data.settings.channels.metaConnected);
          setIsWooConnected(!!data.settings.store?.wooConnected);
        }
      })
      .catch(err => console.error('Error fetching settings status:', err));
  }, []);

  const showWhatsappTag = !isWaConnected && !dismissedWa;
  const showWooTag = !isWooConnected && !dismissedWoo;

  if (!showWhatsappTag && !showWooTag) return null;

  return (
    <div className="w-full bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-1 mb-3 flex items-center justify-between min-h-[30px] max-h-[32px] text-xs transition-all shrink-0">
      <div className="flex items-center gap-1.5 text-zinc-500 font-medium text-[11px]">
        <ShieldAlert className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <span>Estado de conexiones:</span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* TAG 1: WHATSAPP DESCONECTADO (SOLO SI REALMENTE NO ESTÁ CONECTADO) */}
        {showWhatsappTag && (
          <div className="inline-flex items-center gap-1.5 bg-zinc-200/80 border border-zinc-300/70 text-[#8B0000] font-bold px-2.5 py-0.5 rounded-full text-[11px] transition-all hover:bg-zinc-200">
            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
            <Link href="/ajustes?tab=canales" className="hover:underline">
              WhatsApp: Desconectado
            </Link>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setDismissedWa(true);
              }}
              title="Descartar aviso"
              className="text-zinc-500 hover:text-zinc-800 cursor-pointer ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* TAG 2: WOOCOMMERCE PROBLEMAS */}
        {showWooTag && (
          <div className="inline-flex items-center gap-1.5 bg-zinc-200/80 border border-zinc-300/70 text-[#8B0000] font-bold px-2.5 py-0.5 rounded-full text-[11px] transition-all hover:bg-zinc-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <Link href="/ajustes?tab=tienda" className="hover:underline">
              WooCommerce: Problemas
            </Link>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setDismissedWoo(true);
              }}
              title="Descartar aviso"
              className="text-zinc-500 hover:text-zinc-800 cursor-pointer ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
