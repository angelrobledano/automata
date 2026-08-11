"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, X, ArrowRight, ShieldCheck, Clock, MessageSquare, Truck, HelpCircle, UserCheck, Sparkles, Smartphone, Check
} from 'lucide-react';

export default function LandingPage() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100">
      
      {/* HEADER FIX NAVEGACIÓN */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span>
            Automata<span className="text-blue-600">.</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
              Iniciar sesión
            </Link>
            <Link 
              href="/register" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow-md cursor-pointer"
            >
              Probar 14 días gratis →
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION (PROPUESTA DE VALOR EN AHORRO DE TIEMPO) */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* COLUMNA IZQUIERDA: COPY & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-800">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Soporte y Pedidos en Autopilot por WhatsApp</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
              Te ayudamos a ahorrar tiempo de mirar el móvil a todas horas.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl">
              Tu asistente IA responde las dudas de tus clientes 24/7 y da información sobre el estado de sus pedidos sin que tengas que intervenir.
            </p>

            {/* CAPTURA DE LEAD / CTA */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = `/register?email=${encodeURIComponent(email)}`;
              }}
              className="space-y-3 pt-2 max-w-md"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo electrónico..." 
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                  required
                />
                <button 
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  <span>Probar 14 días gratis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold text-center sm:text-left">
                Sin tarjeta de crédito • Configuración en 3 min
              </p>
            </form>
          </div>

          {/* COLUMNA DERECHA: MOCKUP SMARTPHONE WHATSAPP REAL */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-[340px] bg-slate-900 rounded-[40px] p-3.5 shadow-2xl border-4 border-slate-800 relative">
              {/* NOTCH / CAMERA */}
              <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-3"></div>

              {/* PANTALLA SMARTPHONE WHATSAPP */}
              <div className="bg-[#E5DDD5] rounded-[28px] overflow-hidden flex flex-col h-[480px] text-xs font-sans">
                {/* WHATSAPP HEADER */}
                <div className="bg-[#075E54] text-white p-3 flex items-center gap-2.5 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    Z
                  </div>
                  <div>
                    <h4 className="font-bold text-xs leading-none">Zapatería Central</h4>
                    <span className="text-[10px] opacity-80 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Asistente IA · En línea
                    </span>
                  </div>
                </div>

                {/* MENSAJES STREAM */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {/* CLIENTE */}
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-900 rounded-lg p-2.5 max-w-[85%] shadow-2xs space-y-1">
                      <p>¿Dónde está mi pedido #1204?</p>
                      <span className="text-[9px] text-slate-400 block text-right">14:32</span>
                    </div>
                  </div>

                  {/* ASISTENTE IA (EN 2 SEGUNDOS) */}
                  <div className="flex justify-end">
                    <div className="bg-[#DCF8C6] text-slate-900 rounded-lg p-2.5 max-w-[90%] shadow-2xs space-y-1.5">
                      <p className="font-medium">¡Hola Juan! Tu pedido #1204 de Zapatería Central está en camino mediante <strong>Correos Express</strong>. 🚚</p>
                      <p className="text-[11px] text-slate-700 bg-white/60 p-1.5 rounded">
                        <strong>Tracking:</strong> ES92837192<br />
                        <strong>Estado:</strong> En reparto hoy<br />
                        <strong>Entrega estimada:</strong> Mañana antes de las 14:00
                      </p>
                      <span className="text-[9px] text-emerald-800 block text-right font-semibold">14:32 · Respuesto en 2s</span>
                    </div>
                  </div>

                  {/* CLIENTE GRACIAS */}
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-900 rounded-lg p-2.5 max-w-[85%] shadow-2xs space-y-1">
                      <p>¡Genial, muchas gracias por la rapidez! 🙌</p>
                      <span className="text-[9px] text-slate-400 block text-right">14:33</span>
                    </div>
                  </div>
                </div>

                {/* WHATSAPP INPUT MOCK */}
                <div className="bg-slate-100 p-2 border-t border-slate-200 flex items-center gap-2 text-slate-400 text-[11px]">
                  <div className="flex-1 bg-white rounded-full px-3 py-1.5 border border-slate-200">
                    Escribe un mensaje...
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#075E54] text-white flex items-center justify-center font-bold">
                    ➤
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. SOCIAL PROOF / IMPACT METRICS */}
      <section className="py-12 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-black text-blue-600 tracking-tight block">+15 horas</span>
            <p className="text-xs font-bold text-slate-700">ahorradas a la semana por negocio</p>
            <p className="text-[11px] text-slate-500">Menos interrupciones en tu día a día</p>
          </div>

          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight block">92%</span>
            <p className="text-xs font-bold text-slate-700">de dudas frecuentes resueltas</p>
            <p className="text-[11px] text-slate-500">Sin intervención humana manual</p>
          </div>

          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight block">2 segundos</span>
            <p className="text-xs font-bold text-slate-700">tiempo medio de respuesta</p>
            <p className="text-[11px] text-slate-500">Respuestas inmediatas sobre estado de pedidos</p>
          </div>
        </div>
      </section>

      {/* 3. EL PROBLEMA VS LA SOLUCIÓN (BEFORE / AFTER CARDS) */}
      <section className="py-20 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Recupera el control de tu tiempo</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">La diferencia entre vivir pegado al teléfono o dejar que tu negocio responda solo.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* TARJETA 1: EL CAOS DIARIO */}
          <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg font-bold text-xs">❌</span>
              <h3 className="text-sm font-bold text-rose-900">El caos diario antes de Automata</h3>
            </div>

            <ul className="space-y-3 text-xs text-rose-950 font-medium">
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>Interrupciones constantes en tu jornada respondiendo las mismas 10 preguntas.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>Mirar el móvil en cenas, fines de semana o vacaciones por miedo a dejar clientes colgados.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>Retrasos buscando números de seguimiento uno a uno en la web del transportista.</span>
              </li>
            </ul>
          </div>

          {/* TARJETA 2: TU ASISTENTE EN AUTOPILOT */}
          <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500 text-white rounded-lg font-bold text-xs">✅</span>
              <h3 className="text-sm font-bold text-emerald-950">Tu asistente IA en Autopilot</h3>
            </div>

            <ul className="space-y-3 text-xs text-emerald-950 font-semibold">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Consultas de pedidos resueltas al instante con integración automática.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Respuestas precisas sobre horarios, políticas de envío y catálogo del negocio.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Notificación al móvil solo cuando un cliente requiere atención humana real.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. CASOS DE USO PRINCIPALES (FEATURE GRID DE 3 PILARES) */}
      <section className="py-20 bg-white border-t border-slate-200/80 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Diseñado para resolver lo que más tiempo te quita</h2>
            <p className="text-xs text-slate-500">Tres pilares fundamentales para automatizar tu atención al cliente en WhatsApp.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* PILAR 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">1. Estado de Pedidos en Tiempo Real</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Se conecta a tu tienda online o sistema para decir al cliente dónde está su paquete al momento sin hacerle esperar ni buscar manualmente.
              </p>
            </div>

            {/* PILAR 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">2. Resolución de Dudas Frecuentes</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Aprende tus políticas de envío, cambios de talla, horarios y detalles del negocio en minutos leyendo tus documentos.
              </p>
            </div>

            {/* PILAR 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">3. Control Humano cuando Importa</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                La IA se pausa y deriva la conversación a tu equipo solo en casos complejos o de alta prioridad con aviso discreto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CHAT TESTIMONIALS / CASOS REALES */}
      <section className="py-20 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-md mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Ejemplos de conversaciones reales</h2>
          <p className="text-xs text-slate-500">Respuestas precisas que generan confianza e inmediatez.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* EJEMPLO A: DUDAS Y POLÍTICAS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Soporte y Políticas
            </span>
            
            <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-900 max-w-[90%]">
                <p>— ¿Tenéis cambio de talla gratuito?</p>
              </div>
              <div className="bg-emerald-100/70 p-2.5 rounded-lg text-emerald-950 max-w-[95%] ml-auto font-medium">
                <p>— ¡Hola! Sí, los cambios de talla son 100% gratuitos durante 30 días. Te enviamos al mensajero a entregar la nueva talla y recoger la anterior sin coste.</p>
              </div>
            </div>
          </div>

          {/* EJEMPLO B: SEGUIMIENTO DE PEDIDOS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Estado de Envíos
            </span>
            
            <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-900 max-w-[90%]">
                <p>— ¿Cuándo llega mi paquete?</p>
              </div>
              <div className="bg-emerald-100/70 p-2.5 rounded-lg text-emerald-950 max-w-[95%] ml-auto font-medium">
                <p>— Tu paquete del pedido #4891 llegará mañana entre las 10:00 y las 14:00 por Correos Express. Puedes ver el seguimiento en vivo aquí: [Tracking]</p>
              </div>
            </div>
          </div>
        </div>

        {/* TESTIMONIO DESTACADO */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 text-center space-y-3 shadow-md">
          <p className="text-base sm:text-lg font-medium italic text-slate-100 max-w-2xl mx-auto">
            "Por fin puedo desconectar el fin de semana sin dejar a mis clientes desatendidos ni perder ventas."
          </p>
          <p className="text-xs text-blue-400 font-bold">
            Carlos M. · Fundador de Calzados & Moda (Madrid)
          </p>
        </div>
      </section>

      {/* 6. PRICING & FAQ */}
      <section className="py-20 bg-white border-t border-slate-200/80 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          
          {/* PRICING CARD */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-6 max-w-xl mx-auto shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100/80 px-3 py-1 rounded-full">
              Plan Tarifario Único
            </span>
            <div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-slate-900 tracking-tight">49€</span>
                <span className="text-sm font-bold text-slate-500">/ mes</span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Recupera tu tiempo por menos del coste de una sola hora de soporte manual al día.
              </p>
            </div>

            <ul className="text-xs text-slate-700 space-y-2 text-left max-w-sm mx-auto font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Conversaciones de WhatsApp ilimitadas 24/7
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Consulta automática de estado de pedidos
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Lectura de catálogo y documentos en 2 min
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Derivación y control humano instantáneo
              </li>
            </ul>

            <Link 
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:shadow-lg cursor-pointer w-full"
            >
              <span>Probar 14 días gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* PREGUNTAS FRECUENTES (FAQ ORIENTADAS A LA TRANQUILIDAD) */}
          <div className="space-y-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-slate-900 text-center">Preguntas Frecuentes</h3>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">¿Qué pasa si la IA no sabe responder algo?</h4>
                <p className="text-slate-600 leading-relaxed font-normal">
                  El asistente pausará su respuesta y derivará la conversación a tu bandeja de entrada avisándote discretamente para que tomes el control sin ningún riesgo.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">¿Cómo se conecta con los datos de mis pedidos?</h4>
                <p className="text-slate-600 leading-relaxed font-normal">
                  Se conecta automáticamente con tu tienda WooCommerce, Shopify o sistema en menos de 3 minutos mediante claves seguras de API.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">¿Puedo tomar el control del chat en cualquier momento?</h4>
                <p className="text-slate-600 leading-relaxed font-normal">
                  Sí, en cuanto respondes a un cliente desde tu panel o móvil, la IA se congela automáticamente para dejarte la atención completa a ti.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-slate-200/80 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto space-y-2">
          <p className="font-bold text-slate-900">Automata.</p>
          <p>&copy; {new Date().getFullYear()} Automata. Asistente IA de Soporte y Pedidos para comercio electrónico.</p>
        </div>
      </footer>

    </div>
  );
}
