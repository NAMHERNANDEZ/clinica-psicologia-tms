import { useLanguage } from '../context/LanguageContext';

export default function Terms() {
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
            {language === 'es' ? 'Términos y Condiciones' : 'Terms and Conditions'}
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
                <h2 className="text-2xl font-bold text-navy-900 mb-4">Aceptación de Términos</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Al acceder o utilizar los servicios de Neurociencia Clínica, usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con estos términos, por favor no utilice nuestros servicios.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Servicios de Salud Mental</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  La información y servicios proporcionados son para fines de tratamiento psicológico y asistencia en salud mental. Cualquier confianza que usted coloque en dicha información es bajo su propia discreción. El tratamiento requiere evaluación clínica individual y los resultados pueden variar entre pacientes.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Elegibilidad para Tratamiento</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  La elegibilidad para cualquier tratamiento, incluyendo psicoterapia o EMT/TMS, se determina a través de una evaluación clínica integral por nuestro equipo profesional. Las decisiones de tratamiento se toman individualmente considerando el historial médico, estado de salud actual y posibles contraindicaciones.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Responsabilidades del Paciente</h2>
                <p className="text-slate-600 mb-4">Como paciente, usted se compromete a:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Proporcionar información precisa y completa de su historial médico y psicológico</li>
                  <li>Informar a nuestro equipo sobre cualquier cambio en su estado de salud o medicamentos</li>
                  <li>Asistir a citas programadas o proporcionar aviso adecuado de cancelación</li>
                  <li>Seguir los protocolos de tratamiento según lo prescrito por su equipo terapéutico</li>
                  <li>Reportar cualquier efecto adverso o preocupación de manera oportuna</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Resultados del Tratamiento</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Si bien la psicoterapia y la EMT/TMS han demostrado ser efectivas para muchos pacientes, los resultados individuales varían. No podemos garantizar resultados específicos del tratamiento. La respuesta al tratamiento depende de múltiples factores incluyendo fisiología individual, severidad de la condición y adherencia a los protocolos terapéuticos.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Pagos y Cancelaciones</h2>
                <p className="text-slate-600 mb-4">Los términos de pago y políticas de cancelación se discutirán durante su consulta. Nos reservamos el derecho de:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Requerir pago o autorización de seguro antes del tratamiento</li>
                  <li>Cobrar por citas perdidas sin aviso adecuado</li>
                  <li>Modificar planes de tratamiento basándose en el progreso clínico</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Propiedad Intelectual</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Todo el contenido de este sitio web, incluyendo texto, imágenes, logotipos y elementos de diseño, es propiedad de Neurociencia Clínica o sus proveedores de contenido y está protegido por leyes de propiedad intelectual. No puede reproducir, distribuir o crear obras derivadas sin permiso.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Limitación de Responsabilidad</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  En la máxima medida permitida por ley, Neurociencia Clínica no será responsable por ningún daño indirecto, incidental, especial, consecutivo o punitivo que surja de o esté relacionado con su uso de nuestros servicios.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Ley Aplicable</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Estos Términos y Condiciones se regirán e interpretarán de acuerdo con las leyes de México. Cualquier disputa que surja bajo o en conexión con estos términos estará sujeta a la jurisdicción exclusiva de los tribunales de México.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Cambios a los Términos</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios serán efectivos inmediatamente después de su publicación en nuestro sitio web. Su uso continuado de nuestros servicios después de cualquier cambio constituye la aceptación de los nuevos términos.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Contacto</h2>
                <p className="text-slate-600 mb-4">Para preguntas sobre estos Términos y Condiciones:</p>
                <div className="bg-slate-50 rounded-xl p-6">
                  <p className="text-navy-700 font-medium">Neurociencia Clínica</p>
                  <p className="text-slate-600">Teléfono: +52 231 144 2941</p>
                  <p className="text-slate-600">WhatsApp: +52 231 144 2941</p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">Acceptance of Terms</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  By accessing or using the services of Clinical Neuroscience, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Mental Health Services</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  The information and services provided are for psychological treatment and mental health assistance purposes. Any reliance you place on such information is at your own discretion. Treatment requires individual clinical evaluation and results may vary between patients.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Treatment Eligibility</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Eligibility for any treatment, including psychotherapy or TMS, is determined through a comprehensive clinical evaluation by our professional team. Treatment decisions are made on an individual basis considering medical history, current health status, and potential contraindications.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Patient Responsibilities</h2>
                <p className="text-slate-600 mb-4">As a patient, you agree to:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Provide accurate and complete information about your medical and psychological history</li>
                  <li>Inform our team of any changes in health status or medications</li>
                  <li>Attend scheduled appointments or provide adequate cancellation notice</li>
                  <li>Follow treatment protocols as prescribed by your therapeutic team</li>
                  <li>Report any adverse effects or concerns in a timely manner</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Treatment Outcomes</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  While psychotherapy and TMS have proven effective for many patients, individual results vary. We cannot guarantee specific treatment outcomes. Response to treatment depends on multiple factors including individual physiology, severity of condition, and adherence to therapeutic protocols.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Payments and Cancellations</h2>
                <p className="text-slate-600 mb-4">Payment terms and cancellation policies will be discussed during your consultation. We reserve the right to:</p>
                <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
                  <li>Require payment or insurance authorization prior to treatment</li>
                  <li>Charge for missed appointments without adequate notice</li>
                  <li>Modify treatment plans based on clinical progress</li>
                </ul>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Intellectual Property</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  All content on this website, including text, images, logos and design elements, is property of Clinical Neuroscience or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without permission.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Limitation of Liability</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  To the fullest extent permitted by law, Clinical Neuroscience shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our services.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Governing Law</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  These Terms and Conditions shall be governed by and construed in accordance with the laws of Mexico. Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Mexico.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Changes to Terms</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on our website. Your continued use of our services following any changes constitutes acceptance of the new terms.
                </p>

                <h2 className="text-2xl font-bold text-navy-900 mb-4">Contact</h2>
                <p className="text-slate-600 mb-4">For questions about these Terms and Conditions:</p>
                <div className="bg-slate-50 rounded-xl p-6">
                  <p className="text-navy-700 font-medium">Clinical Neuroscience</p>
                  <p className="text-slate-600">Phone: +52 231 144 2941</p>
                  <p className="text-slate-600">WhatsApp: +52 231 144 2941</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
