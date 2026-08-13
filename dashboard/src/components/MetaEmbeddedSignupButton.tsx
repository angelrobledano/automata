'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface MetaEmbeddedSignupButtonProps {
  onSuccess: () => void;
  onError: (msg: string) => void;
  className?: string;
  buttonText?: string;
}

export function MetaEmbeddedSignupButton({
  onSuccess,
  onError,
  className = '',
  buttonText = 'Conectar WhatsApp Oficial con Meta'
}: MetaEmbeddedSignupButtonProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar SDK de Facebook de forma asíncrona si no está ya cargado
    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/es_ES/sdk.js';
      js.async = true;
      js.defer = true;
      document.body.appendChild(js);
    }

    window.fbAsyncInit = function() {
      const appId = process.env.NEXT_PUBLIC_META_APP_ID || '2815161522203005';
      if (window.FB) {
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v19.0'
        });
      }
    };

    // Escuchar eventos de Embedded Signup devueltos por la ventana emergente de Meta
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('[Meta Embedded Signup Event]', data.data);
          const { phone_number_id, waba_id } = data.data || {};
          if (phone_number_id && waba_id) {
            const res = await fetch('/api/onboarding/meta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                waPhoneNumberId: phone_number_id,
                wabaId: waba_id
              })
            });
            if (res.ok) {
              onSuccess();
            } else {
              const err = await res.json();
              onError(err.error || 'Error registrando el canal de WhatsApp');
            }
          }
        }
      } catch (e) {
        // Ignorar mensajes postMessage no estructurados
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, onError]);

  const launchEmbeddedSignup = () => {
    setLoading(true);
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
    
    if (!window.FB) {
      // Intentar inicializar si el SDK ya se cargó en el DOM
      const appId = process.env.NEXT_PUBLIC_META_APP_ID || '2815161522203005';
      if (typeof window !== 'undefined' && (window as any).FB) {
        window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version: 'v19.0' });
      } else {
        setLoading(false);
        onError('Cargando el SDK de Meta... Por favor, pulsa el botón de nuevo en un segundo.');
        return;
      }
    }

    const loginOptions: any = {
      response_type: 'code',
      override_default_response_type: true
    };

    if (configId && configId !== 'WHATSAPP_EMBEDDED_SIGNUP') {
      loginOptions.config_id = configId;
      loginOptions.extras = {
        setup: {
          solution_name: 'Automata IA'
        }
      };
    } else {
      loginOptions.scope = 'whatsapp_business_management,whatsapp_business_messaging';
    }

    try {
      window.FB.login((response: any) => {
        setLoading(false);
        if (response && response.authResponse && response.authResponse.code) {
          const code = response.authResponse.code;
          fetch('/api/meta/callback?code=' + code + '&state=' + btoa(JSON.stringify({ embedded: true })))
            .then(res => {
              if (res.ok) {
                onSuccess();
              } else {
                onError('No se pudo completar el intercambio de credenciales con Meta');
              }
            })
            .catch(() => onError('Error de comunicación con el servidor de Automata'));
        } else {
          // El usuario cerró la ventana emergente o canceló la autorización
          // IMPORTANTE: NO redirigimos la ventana principal a Facebook. Mantenemos la sesión dentro de Automata.
          console.log('[Meta Signup] Pop-up cerrado o proceso cancelado por el usuario.');
          onError('Proceso cancelado en Meta. Puedes volver a intentarlo en cualquier momento.');
        }
      }, loginOptions);
    } catch (e: any) {
      setLoading(false);
      console.error('[Meta Signup Error]', e);
      onError('No se pudo abrir la ventana emergente de Meta. Comprueba que tu navegador no esté bloqueando pop-ups.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
      <button
        type="button"
        onClick={launchEmbeddedSignup}
        disabled={loading}
        className={className || "px-5 py-3 bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1464d1] text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"}
      >
        <svg className={`w-4 h-4 fill-current ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24">
          {loading ? (
            <path d="M12 2v4m0 12v4m8-10h-4M6 12H2m15.071-7.071l-2.829 2.829M7.757 16.243l-2.829 2.829m0-14.142l2.829 2.829m8.486 8.486l2.829 2.829" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          )}
        </svg>
        <span>{loading ? 'Completa el proceso en la ventana emergente de Meta...' : buttonText}</span>
      </button>

      {loading && (
        <span className="text-[11px] text-blue-600 font-medium animate-pulse flex items-center gap-1.5 pt-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping inline-block"></span>
          Ventana de Meta abierta. Por favor, autoriza la conexión en la emergente.
        </span>
      )}
    </div>
  );
}
