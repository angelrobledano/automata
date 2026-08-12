import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span>
            Automata<span className="text-blue-600">.</span>
          </Link>
          <Link href="/login" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <main className="pt-28 pb-20 px-6 max-w-4xl mx-auto space-y-8 text-slate-800 text-sm leading-relaxed">
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Política de Privacidad y Protección de Datos</h1>
          <p className="text-xs text-slate-500 font-medium">Última actualización: 12 de agosto de 2026 • Conforme al RGPD (UE 2016/679) y LOPDGDD</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. Responsable del Tratamiento</h2>
          <p>
            El responsable del tratamiento de los datos personales recabados a través de la plataforma <strong>Automata</strong> (en adelante, &quot;la Plataforma&quot; o &quot;el Servicio&quot;) es Automata Technologies S.L. con domicilio de contacto en España y correo electrónico de privacidad: <a href="mailto:soporte@automata.app" className="text-blue-600 underline">soporte@automata.app</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. Datos que Recopilamos y Finalidad</h2>
          <p>En el marco del servicio de automatización de atención al cliente e IA conversacional por WhatsApp y otros canales, recabamos:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li><strong>Datos de Cuenta de Empresa:</strong> Nombre del negocio, dirección de correo electrónico, contraseña cifrada, teléfono de contacto y datos de facturación.</li>
            <li><strong>Datos de Conversaciones de WhatsApp / Canales:</strong> Identificadores de usuario (número de teléfono o ID de perfil), contenido de los mensajes enviados y recibidos, fecha y hora, e historial conversacional procesado exclusivamente para prestar el servicio de asistencia configurado por el comercio.</li>
            <li><strong>Base de Conocimiento del Comercio:</strong> Documentos, catálogos, horarios y políticas subidas voluntariamente por el comercio para entrenar el asistente IA.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">3. Base Legitimadora del Tratamiento</h2>
          <p>La base legal para el tratamiento de los datos es:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li><strong>Ejecución del Contrato:</strong> Necesario para la prestación del servicio SaaS contratado por el negocio (Art. 6.1.b RGPD).</li>
            <li><strong>Encargado del Tratamiento:</strong> En relación con los datos de los clientes finales del negocio (compradores/usuarios que escriben por WhatsApp), Automata actúa como <em>Encargado del Tratamiento</em> bajo las instrucciones directas del negocio (<em>Responsable del Tratamiento</em>).</li>
            <li><strong>Interés Legítimo y Consentimiento:</strong> Para la seguridad de la plataforma y el cumplimiento de obligaciones legales de facturación.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">4. Destinatarios y Encargados Subcesionarios</h2>
          <p>No vendemos ni comercializamos datos de clientes a terceros. Para prestar el servicio, nos apoyamos en proveedores de infraestructura tecnológica que cumplen estrictamente el RGPD mediante Cláusulas Tipo de la UE (SCC):</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li><strong>Meta Platforms Ireland Ltd. / WhatsApp Business API:</strong> Recepción y envío de mensajería oficial.</li>
            <li><strong>OpenAI Ireland Ltd.:</strong> Procesamiento de lenguaje natural mediante modelos seguros de IA sin uso de los datos para entrenamiento de modelos públicos.</li>
            <li><strong>Stripe Payments Europe Ltd.:</strong> Procesamiento seguro de pagos y suscripciones.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">5. Conservación de Datos</h2>
          <p>
            Los datos de cuenta y facturación se conservarán mientras la suscripción permanezca activa y durante los plazos legalmente exigidos. Las conversaciones y registros de IA pueden ser eliminados o anonimizados a petición expresa del comercio en cualquier momento.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">6. Derechos del Usuario (ARCO / RGPD)</h2>
          <p>Usted puede ejercer en cualquier momento sus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición mediante escrito dirigido a <a href="mailto:soporte@automata.app" className="text-blue-600 underline">soporte@automata.app</a> indicando el asunto &quot;Protección de Datos&quot;.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">7. Seguridad de los Datos</h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas de nivel empresarial, incluyendo cifrado AES-256 para credenciales y tokens, comunicaciones HTTPS/TLS, autenticación JWT, y control estricto de acceso multi-inquilino.
          </p>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Automata. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
