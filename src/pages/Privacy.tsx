import { useLanguage } from '../context/LanguageContext';

export default function Privacy() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Hero */}
      <section className="relative py-16 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {language === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}
          </h1>
          <p className="text-xl text-slate-300">
            {language === 'es' ? 'Última actualización: Junio 2024' : 'Last updated: June 2024'}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12 prose prose-navy max-w-none">
            {language === 'es' ? (
              <>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">Introducción</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Neurociencia Clínica ("nosotros", "nuestro" o "nosotros") respeta su privacidad y se compromete a proteger sus datos personales. Esta política de privacidad explica cómo recopilamos, usamos y salvaguardamos su información cuando utiliza nuestros servicios de psicología clínica y neuromodulación.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Información que Recopilamos</h2>
                <p className="text-slate-600 mb-4">Podemos recopilar los siguientes tipos de información:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Información de identificación personal (nombre, correo electrónico, número de teléfono)</li>
                  <li>Historial médico y de salud mental relevante para el tratamiento</li>
                  <li>Registros de comunicación con nuestra clínica</li>
                  <li>Registros de citas y tratamiento</li>
                  <li>Información de pagos y facturación</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Cómo Usamos Su Información</h2>
                <p className="text-slate-600 mb-4">Su información se utiliza para:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Proporcionar y gestionar servicios de psicología clínica y EMT/TMS</li>
                  <li>Comunicarnos con usted sobre citas y atención continua</li>
                  <li>Cumplir con requisitos legales y regulaciones de salud</li>
                  <li>Mejorar nuestros servicios y experiencia del paciente</li>
                  <li>Enviar comunicaciones relacionadas con su tratamiento (con su consentimiento)</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Seguridad de Datos</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Implementamos medidas técnicas y organizativas apropiadas para proteger sus datos personales contra acceso no autorizado, alteración, divulgación o destrucción. Su información médica y psicológica se maneja de acuerdo con las regulaciones de privacidad sanitaria aplicables en México y estándares internacionales de confidencialidad clínica.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Compartición de Información</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  No vendemos, comercializamos ni alquilamos su información personal a terceros. Podemos compartir su información únicamente con: profesionales de salud mental involucrados en su atención, compañías de seguros para fines de facturación (con su consentimiento), y según lo exija la ley.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Sus Derechos</h2>
                <p className="text-slate-600 mb-4">Usted tiene derecho a:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Acceder a sus datos personales</li>
                  <li>Solicitar la corrección de datos inexactos</li>
                  <li>Solicitar la eliminación de sus datos (sujeto a requisitos legales de retención)</li>
                  <li>Oponerse al procesamiento de sus datos</li>
                  <li>Retirar su consentimiento en cualquier momento</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Confidencialidad Terapéutica</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  La relación terapéutica está protegida por principios de confidencialidad profesional. Todo lo que se discuta en sesión permanece estrictamente confidencial, con excepciones limitadas por ley (riesgo de daño a usted u otros, abuso reportable).
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Contacto</h2>
                <p className="text-slate-600 mb-4">Para preguntas sobre esta política de privacidad o nuestras prácticas de datos:</p>
                <div className="bg-slate-50 rounded-xl p-6">
                  <p className="text-navy-700 font-medium">Neurociencia Clínica</p>
                  <p className="text-slate-600">Teléfono: +52 231 144 2941</p>
                  <p className="text-slate-600">WhatsApp: +52 231 144 2941</p>
                  <p className="text-slate-600">Xiutetelco y región Veracruz-Puebla</p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">Introduction</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Clinical Neuroscience ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our clinical psychology and neuromodulation services.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Information We Collect</h2>
                <p className="text-slate-600 mb-4">We may collect the following types of information:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Personal identification information (name, email address, phone number)</li>
                  <li>Medical and mental health history relevant to treatment</li>
                  <li>Communication records with our clinic</li>
                  <li>Appointment and treatment records</li>
                  <li>Payment and billing information</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">How We Use Your Information</h2>
                <p className="text-slate-600 mb-4">Your information is used to:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Provide and manage clinical psychology and TMS services</li>
                  <li>Communicate with you about appointments and ongoing care</li>
                  <li>Comply with legal requirements and health regulations</li>
                  <li>Improve our services and patient experience</li>
                  <li>Send treatment-related communications (with your consent)</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Data Security</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Your medical and psychological information is handled in accordance with applicable health privacy regulations in Mexico and international standards of clinical confidentiality.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Information Sharing</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  We do not sell, trade, or rent your personal information to third parties. We may share your information only with: mental health professionals involved in your care, insurance companies for billing purposes (with your consent), and as required by law.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Your Rights</h2>
                <p className="text-slate-600 mb-4">You have the right to:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Access your personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data (subject to legal retention requirements)</li>
                  <li>Object to processing of your data</li>
                  <li>Withdraw your consent at any time</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Therapeutic Confidentiality</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  The therapeutic relationship is protected by principles of professional confidentiality. Everything discussed in session remains strictly confidential, with limited exceptions required by law (risk of harm to yourself or others, reportable abuse).
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Contact</h2>
                <p className="text-slate-600 mb-4">For questions about this privacy policy or our data practices:</p>
                <div className="bg-slate-50 rounded-xl p-6">
                  <p className="text-navy-700 font-medium">Clinical Neuroscience</p>
                  <p className="text-slate-600">Phone: +52 231 144 2941</p>
                  <p className="text-slate-600">WhatsApp: +52 231 144 2941</p>
                  <p className="text-slate-600">Xiutetelco and Veracruz-Puebla region</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
