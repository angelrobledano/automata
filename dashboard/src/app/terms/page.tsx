import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-4xl mx-auto px-4 flex justify-between">
          <Link href="/" className="text-xl font-black text-indigo-600 tracking-tight">Automata.</Link>
          <span className="text-sm text-gray-500 mt-1">Legal</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 prose prose-indigo max-w-none">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Términos y Condiciones del Servicio</h1>
          <p className="text-sm text-slate-500 mb-8">Última actualización: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Aceptación de los Términos</h2>
              <p>Al acceder y utilizar Automata, usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Descripción del Servicio</h2>
              <p>Automata proporciona una plataforma de software como servicio (SaaS) que permite a los comercios automatizar la atención al cliente y la toma de pedidos a través de WhatsApp, Instagram y Messenger utilizando Inteligencia Artificial.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Uso Aceptable y Cumplimiento con Meta</h2>
              <p>Como usuario de Automata, usted acepta cumplir estrictamente con:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>La Política de Comercio de WhatsApp.</li>
                <li>Las Políticas para Desarrolladores de Meta Platforms, Inc.</li>
                <li>Leyes locales aplicables relacionadas con el comercio electrónico y la protección de datos de los consumidores.</li>
              </ul>
              <p className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                El incumplimiento de las políticas de Meta resultará en la suspensión inmediata de su cuenta de Automata sin derecho a reembolso.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Responsabilidad</h2>
              <p>Aunque nuestra Inteligencia Artificial está diseñada para minimizar errores (alucinaciones), Automata no se hace responsable de pérdidas financieras derivadas de respuestas automatizadas incorrectas o fallos en la sincronización con plataformas de terceros (ej. WooCommerce).</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Suscripción y Facturación</h2>
              <p>El uso continuado de la plataforma requiere una suscripción activa y al día. Nos reservamos el derecho de modificar nuestras tarifas con previo aviso de 30 días.</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
