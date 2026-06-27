"use client";

import Link from 'next/link';
import { useState } from 'react';
import { 
  MessageCircle, PhoneCall, Clock, TrendingUp, CheckCircle2, 
  ChevronDown, ArrowRight, Zap, Shield, Smartphone 
} from 'lucide-react';

export default function PremiumLandingPage() {
  const [activeTab, setActiveTab] = useState<'restaurante' | 'tienda'>('restaurante');

  const faqs = [
    { q: "¿Suena como un robot telefónico antiguo?", a: "No. Habla con total naturalidad, con pausas e inflexiones humanas." },
    { q: "¿Puede equivocarse en los precios?", a: "No. Solo responde usando la información exacta que tú le proporciones." },
    { q: "¿Tengo que saber programar?", a: "En absoluto. Si sabes escribir un mensaje de WhatsApp, sabes configurarlo en 2 minutos." },
    { q: "¿Qué pasa si le hacen una pregunta muy rara?", a: "Si no sabe la respuesta, te transfiere la conversación silenciosamente para que tú la retomes." },
    { q: "¿Hay coste de instalación?", a: "Cero. Lo haces tú mismo gratis en menos de 5 minutos." },
    { q: "¿Se conecta con mi tienda online?", a: "Sí, se integra de forma nativa con WooCommerce para procesar pedidos reales." }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-200">
      
      {/* 1. HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-indigo-600 tracking-tight">Automata.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Iniciar Sesión
            </Link>
            <Link href="/register" className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all transform hover:scale-105">
              Probar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2 animate-pulse"></span>
            El primer empleado que no duerme
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Tu teléfono no deja de sonar. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Deja que responda tu mejor empleado.
            </span>
          </h1>
          
          <p className="mt-8 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Convierte tu WhatsApp y el teléfono fijo en un vendedor disponible 24/7. Responde dudas sobre tus productos y toma pedidos automáticamente mientras tú te centras en tu tienda.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register" className="w-full sm:w-auto px-8 py-4 text-lg font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all transform hover:scale-105 flex items-center justify-center gap-2">
              Probar 14 días gratis <ArrowRight size={20} />
            </Link>
            <span className="text-sm text-slate-500 font-medium">Sin tarjeta de crédito. Cancele en 1 clic.</span>
          </div>
        </div>
        
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/40 blur-3xl"></div>
          <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-blue-200/40 to-indigo-100/40 blur-3xl"></div>
        </div>
      </section>

      {/* 3. PROBLEMA & COSTE OCULTO */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                Estás perdiendo dinero cada vez que no puedes contestar.
              </h2>
              <p className="mt-6 text-lg text-slate-600">
                Estás atendiendo a un cliente en el mostrador y el WhatsApp vibra. Si no contestas, pierdes una venta online. Si contestas, das un mal servicio al cliente que tienes delante. No abriste tu negocio para ser esclavo del móvil.
              </p>
              
              <div className="mt-8 space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                    <TrendingUp size={24} className="rotate-180" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">4 de cada 10 clientes</h4>
                    <p className="text-slate-600">Se van a la competencia si no respondes en 5 minutos.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">15 horas al mes perdidas</h4>
                    <p className="text-slate-600">Escribiendo "Sí, abrimos a las 10:00" cientos de veces.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm relative">
              <div className="absolute -top-4 -right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                Sábado 23:45h
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm w-[80%]">
                  <p className="text-slate-800">Hola, ¿qué cafetera recomendáis para empezar a hacer café de especialidad?</p>
                </div>
                <div className="flex justify-end">
                  <div className="bg-indigo-600 p-4 rounded-2xl rounded-tr-sm shadow-sm w-[80%] text-white opacity-50">
                    <p>...</p>
                    <span className="text-[10px] opacity-70 mt-1 block">Leído el domingo a las 10:00h (Venta perdida)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CÓMO FUNCIONA & CASOS REALES (MOCKUP INTERACTIVO) */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Conoce a tu nuevo encargado.
            </h2>
            <p className="mt-6 text-xl text-slate-400">
              Automata se conecta a tus líneas actuales en 2 minutos. Entiende lo que el cliente quiere y cierra la venta con la naturalidad de un humano.
            </p>
          </div>

          {/* Interactive Chat Mockup */}
          <div className="max-w-4xl mx-auto bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="flex border-b border-slate-700">
              <button 
                onClick={() => setActiveTab('restaurante')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'restaurante' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
              >
                ☕ Caso: Tienda de Café y Té
              </button>
              <button 
                onClick={() => setActiveTab('tienda')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'tienda' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
              >
                🛍️ Caso: E-commerce de madrugada
              </button>
            </div>
            
            <div className="p-6 md:p-10 bg-[#0B141A]">
              <div className="space-y-6">
                {activeTab === 'restaurante' ? (
                  <>
                    <div className="bg-[#202C33] p-4 rounded-2xl rounded-tl-sm w-[85%] md:w-[70%]">
                      <p className="text-[#E9EDEF]">Hola, buscaba un té verde suave y unos filtros de papel para regalo.</p>
                      <span className="text-[10px] text-[#8696A0] float-right mt-2">21:30</span>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#005C4B] p-4 rounded-2xl rounded-tr-sm w-[85%] md:w-[70%]">
                        <p className="text-[#E9EDEF]">¡Hola! 🍵 Para un té verde suave te recomiendo nuestra mezcla "Sencha Premium". Y tenemos paquetes de 100 filtros Hario V60. ¿Te los preparo para recoger mañana en tienda o prefieres envío?</p>
                        <span className="text-[10px] text-[#8DB8B2] float-right mt-2">21:30 ✓✓</span>
                      </div>
                    </div>
                    <div className="bg-[#202C33] p-4 rounded-2xl rounded-tl-sm w-[85%] md:w-[70%]">
                      <p className="text-[#E9EDEF]">Paso mañana a recogerlos. Gracias!</p>
                      <span className="text-[10px] text-[#8696A0] float-right mt-2">21:31</span>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#005C4B] p-4 rounded-2xl rounded-tr-sm w-[85%] md:w-[70%]">
                        <p className="text-[#E9EDEF]">¡Genial! Pedido creado. Te costará 18,50€. Nos vemos mañana por la tienda. 👋</p>
                        <span className="text-[10px] text-[#8DB8B2] float-right mt-2">21:31 ✓✓</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-[#202C33] p-4 rounded-2xl rounded-tl-sm w-[85%] md:w-[70%]">
                      <p className="text-[#E9EDEF]">Hola, ¿la camiseta negra talla M encoge al lavarla?</p>
                      <span className="text-[10px] text-[#8696A0] float-right mt-2">03:15 AM</span>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#005C4B] p-4 rounded-2xl rounded-tr-sm w-[85%] md:w-[70%]">
                        <p className="text-[#E9EDEF]">¡Hola! Las camisetas negras son 100% algodón pre-encogido, así que no te darán problemas al lavarlas en frío. ¿Quieres que te añada una al carrito?</p>
                        <span className="text-[10px] text-[#8DB8B2] float-right mt-2">03:15 AM ✓✓</span>
                      </div>
                    </div>
                    <div className="bg-[#202C33] p-4 rounded-2xl rounded-tl-sm w-[85%] md:w-[70%]">
                      <p className="text-[#E9EDEF]">Sí, por favor.</p>
                      <span className="text-[10px] text-[#8696A0] float-right mt-2">03:16 AM</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BENTO BOX BENEFICIOS */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 bg-white p-10 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <Shield className="text-indigo-600 mb-6" size={40} />
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Duerme tranquilo. Nosotros vendemos.</h3>
              <p className="text-slate-600 text-lg">Cierra ventas a las 4 de la mañana. Tu negocio sigue facturando incluso cuando tienes la persiana bajada.</p>
            </div>
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <Zap className="text-indigo-600 mb-6" size={40} />
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Respuesta en 3 segundos.</h3>
              <p className="text-slate-600">Fideliza a la primera. Nadie espera.</p>
            </div>
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <Smartphone className="text-indigo-600 mb-6" size={40} />
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Integrado con WhatsApp</h3>
              <p className="text-slate-600">Conecta tu número actual en 1 clic. Cero fricción.</p>
            </div>
            <div className="col-span-1 md:col-span-2 bg-indigo-600 p-10 rounded-3xl border border-indigo-500 shadow-lg text-white">
              <h3 className="text-2xl font-bold mb-4">La productividad de 3 recepcionistas.</h3>
              <p className="text-indigo-100 text-lg mb-8">Por el precio de una cena. Adiós al "copiar y pegar" los mismos mensajes cientos de veces. Recupera tus fines de semana.</p>
              <Link href="/register" className="inline-flex bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                Activar Automata Hoy
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. COMPARATIVA */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">No hay color.</h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-6 text-slate-500 font-semibold w-1/4"></th>
                  <th className="p-6 text-slate-900 font-bold w-1/4">Atención Manual</th>
                  <th className="p-6 text-slate-900 font-bold w-1/4">Contratar Empleado</th>
                  <th className="p-6 bg-indigo-50 text-indigo-900 font-black w-1/4 text-xl border-l border-indigo-100">Automata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-6 font-medium text-slate-900">Disponibilidad</td>
                  <td className="p-6 text-slate-600">Solo cuando puedes</td>
                  <td className="p-6 text-slate-600">8 horas al día</td>
                  <td className="p-6 bg-indigo-50/50 text-indigo-700 font-bold border-l border-indigo-100">24/7/365</td>
                </tr>
                <tr>
                  <td className="p-6 font-medium text-slate-900">Tiempo respuesta</td>
                  <td className="p-6 text-slate-600">Horas (o días)</td>
                  <td className="p-6 text-slate-600">Minutos</td>
                  <td className="p-6 bg-indigo-50/50 text-indigo-700 font-bold border-l border-indigo-100">3 segundos</td>
                </tr>
                <tr>
                  <td className="p-6 font-medium text-slate-900">Coste mensual</td>
                  <td className="p-6 text-slate-600 italic">Tu salud mental</td>
                  <td className="p-6 text-slate-600">+1.500€ / mes</td>
                  <td className="p-6 bg-indigo-50/50 text-indigo-700 font-bold border-l border-indigo-100 text-xl">49€ / mes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7. PRICING */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-6">Un único plan. Todo incluido.</h2>
          <p className="text-xl text-slate-400 mb-12">Menos de lo que te cuesta la factura de la luz del local.</p>
          
          <div className="bg-white rounded-3xl p-12 max-w-lg mx-auto shadow-2xl relative transform hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white font-bold px-4 py-1 rounded-full text-sm">
              Más popular
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Plan Pro</h3>
            <div className="my-6 flex justify-center items-baseline">
              <span className="text-6xl font-black text-slate-900">49€</span>
              <span className="text-xl text-slate-500 ml-2">/mes</span>
            </div>
            <ul className="space-y-4 text-left mb-10">
              <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={20} /> Atención 24/7 en WhatsApp y Teléfono</li>
              <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={20} /> Configuración sin código en 2 min</li>
              <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={20} /> Integración con WooCommerce</li>
              <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={20} /> Sin permanencia. Cancela con 1 clic.</li>
            </ul>
            <Link href="/register" className="block w-full py-4 rounded-xl text-white font-bold text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
              Comenzar prueba gratuita
            </Link>
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Preguntas Frecuentes</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="text-lg font-bold text-slate-900">{faq.q}</h4>
                <p className="mt-2 text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="py-24 bg-indigo-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Deja de perder clientes esta misma noche.
          </h2>
          <p className="mt-6 text-xl text-indigo-100">
            Configura tu asistente ahora y despiértate mañana con ventas cerradas en tu bandeja de entrada.
          </p>
          <Link href="/register" className="mt-10 inline-block px-10 py-5 text-xl font-bold rounded-2xl text-indigo-900 bg-white hover:bg-slate-50 shadow-2xl transition-transform transform hover:scale-105">
            Activar mi asistente ahora
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Automata Inc. Todos los derechos reservados.
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">Política de Privacidad</Link>
            <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Términos de Servicio</Link>
            <a href="mailto:legal@automata.com" className="text-sm text-slate-400 hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
