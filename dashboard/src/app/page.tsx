"use client";

import Link from 'next/link';
import { 
  Zap, X, CheckCircle2, Smartphone, MessageCircle, Shield, ArrowRight
} from 'lucide-react';

export default function PremiumLandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20">
      
      {/* HEADER ULTRA-MINIMALISTA */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
          <span className="text-xl font-bold tracking-tighter">
            Automata<span className="text-primary">.</span>
          </span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">
              Empezar Gratis &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION (La Promesa) */}
      <section className="relative pt-48 pb-32 px-6 flex flex-col items-center text-center">
        <div className="max-w-4xl space-y-10">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tighter leading-[1.05]">
            Convierte tu WhatsApp en un <span className="text-primary/90">vendedor 24/7.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
            Responde al instante. Cierra ventas sin mover un dedo. Se configura en 2 minutos sin código.
          </p>
          
          <form className="max-w-md mx-auto flex flex-col sm:flex-row gap-4 pt-8">
            <input 
              type="email" 
              placeholder="Tu correo electrónico..." 
              className="flex-1 h-14 px-0 bg-transparent border-b-2 border-border text-lg text-foreground focus:border-primary focus:outline-none placeholder:text-muted-foreground/50 transition-colors rounded-none"
              required
            />
            <button className="h-14 px-8 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 whitespace-nowrap text-lg">
              Probar gratis
            </button>
          </form>
          <p className="text-sm text-muted-foreground/60 font-medium">No requiere tarjeta de crédito.</p>
        </div>
      </section>

      {/* 2. SECCIÓN DE DOLOR / EMPATÍA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto space-y-24">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">Cliente que no respondes, carrito a la competencia.</h2>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">Un cliente a las 9 PM preguntando por una talla no quiere esperar a mañana. Quiere comprar ahora mismo.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
            <div className="space-y-8">
              <h3 className="text-2xl font-semibold text-muted-foreground">La realidad actual</h3>
              <ul className="space-y-6 text-lg text-muted-foreground/80 font-light">
                <li className="flex gap-4 items-start"><X className="text-muted-foreground shrink-0 mt-1" /> Pierdes ventas porque estás preparando envíos o durmiendo.</li>
                <li className="flex gap-4 items-start"><X className="text-muted-foreground shrink-0 mt-1" /> Clientes frustrados que abandonan por una simple duda.</li>
                <li className="flex gap-4 items-start"><X className="text-muted-foreground shrink-0 mt-1" /> Sacrificas tu tiempo libre contestando dudas repetitivas.</li>
              </ul>
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-semibold text-foreground">Con Automata</h3>
              <ul className="space-y-6 text-lg text-foreground font-medium">
                <li className="flex gap-4 items-start"><CheckCircle2 className="text-primary shrink-0 mt-1" /> Cierras ventas a las 3 AM mientras duermes.</li>
                <li className="flex gap-4 items-start"><CheckCircle2 className="text-primary shrink-0 mt-1" /> Respuestas en 2 segundos. Duda resuelta, carrito pagado.</li>
                <li className="flex gap-4 items-start"><CheckCircle2 className="text-primary shrink-0 mt-1" /> Apagas el móvil. Tu negocio sigue facturando.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ESCAPARATE DE CHATS (Estilo Hilo Minimalista) */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto space-y-24">
          <div className="text-center max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Conversaciones reales.</h2>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">Entiende contextos, recomienda productos y cierra la venta como tu mejor empleado.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-16 lg:gap-12">
            {/* CHAT 1: Pastelería */}
            <div className="space-y-8 relative before:absolute before:inset-y-0 before:-left-6 before:w-px before:bg-border/50">
              <div className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Pastelería Dulce</div>
              <div className="space-y-6 text-lg font-light">
                <div className="text-muted-foreground">
                  — ¡Hola! ¿Tenéis alguna tarta sin gluten disponible para recoger hoy a las 18:00? Es un apuro.
                </div>
                <div className="text-foreground font-medium pl-6 border-l-2 border-primary">
                  ¡Hola! Sí, claro. Tenemos disponible nuestra tarta de zanahoria 100% sin gluten. Cuesta 24€. Si me confirmas tu nombre, te la dejo reservada para las 18:00.
                </div>
                <div className="text-muted-foreground">
                  — ¡Perfecto! Soy Carlos. Pasaré a por ella.
                </div>
              </div>
            </div>

            {/* CHAT 2: Tienda de Té */}
            <div className="space-y-8 relative before:absolute before:inset-y-0 before:-left-6 before:w-px before:bg-border/50">
              <div className="text-sm font-bold tracking-wider text-muted-foreground uppercase">La Casa del Té</div>
              <div className="space-y-6 text-lg font-light">
                <div className="text-muted-foreground">
                  — Hola, busco hacer un regalo. A mi madre le gusta el té verde pero que no sea muy amargo. ¿Qué me recomendáis?
                </div>
                <div className="text-foreground font-medium pl-6 border-l-2 border-primary">
                  ¡Hola! Para regalo te recomiendo nuestra mezcla "Sencha Sakura", tiene un toque muy suave de cereza y cero amargor. Viene en una lata preciosa por 12€. ¿Te envío el link directo de compra?
                </div>
                <div className="text-muted-foreground">
                  — Sí, por favor.
                </div>
              </div>
            </div>

            {/* CHAT 3: Tienda de Bicicletas */}
            <div className="space-y-8 relative before:absolute before:inset-y-0 before:-left-6 before:w-px before:bg-border/50">
              <div className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Bikes & Co</div>
              <div className="space-y-6 text-lg font-light">
                <div className="text-muted-foreground">
                  — Buenas, ¿tenéis recambios de pastillas de freno Shimano Ultegra para carretera en stock?
                </div>
                <div className="text-foreground font-medium pl-6 border-l-2 border-primary">
                  Buenas. Sí, tenemos el pack de pastillas Shimano L05A RF de resina (compatibles con Ultegra). Cuestan 18,50€. Las puedes pasar a recoger hoy mismo o pedirlas en la web. ¿Te las guardo?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "CÓMO FUNCIONA" (Texto Inmenso) */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-24">En marcha en 3 minutos.</h2>
          <div className="space-y-16">
            {[
              { step: "01", title: "Escanea tu WhatsApp", desc: "Como si entraras a WhatsApp Web. Un click y estás conectado a la plataforma." },
              { step: "02", title: "Sube tu Catálogo", desc: "Arrastra el PDF de tu tienda, tus políticas o tu menú. Nosotros hacemos que lo memorice al instante." },
              { step: "03", title: "A vender", desc: "Vete a dormir. Automata se encargará de responder las dudas y cerrar los pedidos por ti." }
            ].map(s => (
              <div key={s.step} className="flex flex-col md:flex-row gap-6 md:gap-12 items-baseline">
                <span className="text-4xl font-light text-muted-foreground/30">{s.step}</span>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">{s.title}</h3>
                  <p className="text-xl text-muted-foreground font-light leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. GRID DE BENEFICIOS COMERCIALES (Sin tarjetas) */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 md:gap-24">
          <div className="space-y-6">
            <Smartphone className="text-foreground" size={40} strokeWidth={1.5} />
            <h3 className="text-2xl font-bold tracking-tight">Tu WhatsApp de siempre</h3>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">Tus clientes no tienen que descargar ninguna app nueva. Te escriben al WhatsApp de tu negocio y reciben respuesta al instante.</p>
          </div>
          <div className="space-y-6">
            <Zap className="text-foreground" size={40} strokeWidth={1.5} />
            <h3 className="text-2xl font-bold tracking-tight">Respuestas en 2 segundos</h3>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">La atención es tan rápida que la venta no tiene tiempo a enfriarse. El cliente siente que tiene tu atención exclusiva.</p>
          </div>
          <div className="space-y-6">
            <MessageCircle className="text-foreground" size={40} strokeWidth={1.5} />
            <h3 className="text-2xl font-bold tracking-tight">Habla como un humano</h3>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">Olvídate de "Pulsa 1 para envíos". Automata entiende el contexto, bromea si toca, y es extremadamente educado.</p>
          </div>
          <div className="space-y-6">
            <Shield className="text-foreground" size={40} strokeWidth={1.5} />
            <h3 className="text-2xl font-bold tracking-tight">Sabe cuándo avisarte</h3>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">Si un cliente hace una pregunta que la IA desconoce o está muy enfadado, Automata te avisa discretamente para que tomes el control.</p>
          </div>
        </div>
      </section>

      {/* 6. TABLA COMPARATIVA (Limpia) */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-24">No hay color.</h2>
          <table className="w-full text-left border-collapse min-w-[600px] text-lg font-light">
            <thead>
              <tr className="border-b-2 border-border text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-6 px-4 font-bold">Característica</th>
                <th className="py-6 px-4 font-bold">Empleado</th>
                <th className="py-6 px-4 font-bold text-foreground">Automata</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border/50">
                <td className="py-6 px-4 text-muted-foreground">Coste mensual</td>
                <td className="py-6 px-4">&gt; 1.500€</td>
                <td className="py-6 px-4 font-medium">49€ fijos</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-6 px-4 text-muted-foreground">Horario</td>
                <td className="py-6 px-4">8 horas al día</td>
                <td className="py-6 px-4 font-medium">24/7 inagotable</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-6 px-4 text-muted-foreground">Trato con el cliente</td>
                <td className="py-6 px-4">Excelente</td>
                <td className="py-6 px-4 font-medium">Natural y empático</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-6 px-4 text-muted-foreground">Configuración</td>
                <td className="py-6 px-4">Meses de formación</td>
                <td className="py-6 px-4 font-medium">2 minutos. Sin código.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. PRICING & FAQ */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-32 space-y-10">
            <h2 className="text-5xl md:text-6xl font-bold tracking-tighter">49€ <span className="text-2xl text-muted-foreground font-light">/ mes</span></h2>
            <p className="text-xl text-muted-foreground font-light max-w-lg mx-auto">Atiende ilimitados clientes 24/7. Lee tu catálogo en segundos. Sin permanencia.</p>
            <Link href="/register" className="inline-flex items-center justify-center px-10 h-16 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-lg transition-transform hover:scale-105 active:scale-95">
              Empezar mis 7 días gratis <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>

          <div className="space-y-12">
            {[
              { q: "¿Tengo que saber programar?", a: "No. Si sabes enviar una foto por WhatsApp, sabes usar Automata. Solo arrastras el PDF de tu tienda y él hace el resto." },
              { q: "¿Qué pasa si la IA se equivoca y da un precio mal?", a: "Imposible. Automata tiene 'memoria blindada'. Solo responde utilizando estrictamente el documento que tú le has subido. No inventa precios." },
              { q: "¿Puedo usar mi número actual de la tienda?", a: "Sí, vinculas tu WhatsApp de toda la vida escaneando un código QR, igual que en WhatsApp Web." },
              { q: "¿Tengo permanencia?", a: "No. Puedes probarlo y si no te convence, cancelar la suscripción con un solo clic desde tu panel." }
            ].map((faq, i) => (
              <div key={i} className="space-y-3">
                <h4 className="text-xl font-medium tracking-tight">{faq.q}</h4>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-24 px-6 text-center border-t border-border/30">
        <div className="max-w-4xl mx-auto space-y-4">
          <span className="text-2xl font-bold tracking-tighter opacity-50">Automata.</span>
          <p className="text-sm text-muted-foreground font-light">
            &copy; {new Date().getFullYear()} Automata. Construido para el comercio local.
          </p>
        </div>
      </footer>

    </div>
  );
}
