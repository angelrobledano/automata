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
    
    if (window.FB) {
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

      window.FB.login(
        (response: any) => {
          setLoading(false);
          if (response.authResponse && response.authResponse.code) {
            const code = response.authResponse.code;
            fetch('/api/meta/callback?code=' + code + '&state=' + btoa(JSON.stringify({ embedded: true })))
              .then(res => res.json())
              .then(data => {
                if (data.success) onSuccess();
                else onError(data.error || 'Error al conectar con Meta');
              })
              .catch(() => onError('Error de conexión con el servidor'));
          } else {
            // Redirección directa como respaldo
            window.location.href = '/api/meta/auth';
          }
        },
        loginOptions
      );
    } else {
      // Redirección directa como respaldo si el SDK no ha cargado aún
      window.location.href = '/api/meta/auth';
    }
  };

  return (
    <button
      type="button"
      onClick={launchEmbeddedSignup}
      disabled={loading}
      className={className || "px-5 py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 shrink-0"}
    >
      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      <span>{loading ? 'Cargando Meta Signup...' : buttonText}</span>
    </button>
  );
}
