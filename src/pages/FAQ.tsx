import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, MessageCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const faqCategories = [
  {
    key: 'psychotherapy',
    questions: [
      {
        q: 'psychotherapy.q1',
        a: { es: 'La duración depende de tus necesidades específicas. Algunas personas ven mejoras en pocas semanas mientras otras requieren meses de trabajo terapéutico. Evaluamos el progreso regularmente para optimizar el tratamiento.', en: 'Duration depends on your specific needs. Some people see improvement in a few weeks while others require months of therapeutic work. We regularly evaluate progress to optimize treatment.' },
      },
      {
        q: 'psychotherapy.q2',
        a: { es: 'Ofrecemos una primera consulta de evaluación para entender tu situación. Esto nos permite recomendar el enfoque terapéutico más adecuado: terapia cognitivo-conductual, psicoterapia psicodinámica, EMDR, o enfoques integrativos.', en: 'We offer an initial evaluation consultation to understand your situation. This allows us to recommend the most appropriate therapeutic approach: cognitive-behavioral therapy, psychodynamic psychotherapy, EMDR, or integrative approaches.' },
      },
      {
        q: 'psychotherapy.q3',
        a: { es: 'Absolutamente. La confidencialidad es fundamental en nuestra práctica. Tu información está protegida bajo estrictos estándares éticos y legales. Solo con tu autorización podemos compartir información.', en: 'Absolutely. Confidentiality is fundamental to our practice. Your information is protected under strict ethical and legal standards. We can only share information with your authorization.' },
      },
    ],
  },
  {
    key: 'anxiety',
    questions: [
      {
        q: 'anxiety.q1',
        a: { es: 'Los trastornos de ansiedad responden muy bien al tratamiento. Combinamos terapia cognitivo-conductual, técnicas de regulación emocional y, cuando está indicado, EMT/TMS para casos más severos o resistentes.', en: 'Anxiety disorders respond very well to treatment. We combine cognitive-behavioral therapy, emotional regulation techniques, and when indicated, TMS for more severe or resistant cases.' },
      },
      {
        q: 'anxiety.q2',
        a: { es: 'Señales como preocupación excesiva, evitación de situaciones, síntomas físicos (palpitaciones, dificultad para respirar), y si interfiere con tu vida diaria. Una evaluación profesional puede confirmar el diagnóstico.', en: 'Signs like excessive worry, avoidance of situations, physical symptoms (palpitations, difficulty breathing), and if it interferes with your daily life. A professional evaluation can confirm the diagnosis.' },
      },
    ],
  },
  {
    key: 'depression',
    questions: [
      {
        q: 'depression.q1',
        a: { es: 'Tratamos la depresión con un enfoque integral: psicoterapia basada en evidencia, evaluación para posible medicación, y EMT/TMS para casos resistentes o cuando se prefiere evitar medicamentos.', en: 'We treat depression with a comprehensive approach: evidence-based psychotherapy, evaluation for possible medication, and TMS for resistant cases or when medication is preferred to be avoided.' },
      },
      {
        q: 'depression.q2',
        a: { es: 'La depresión resistente al tratamiento no ha respondido a al menos dos tratamientos convencionales adecuados. La EMT/TMS está especialmente indicada para estos casos, con alta evidencia de efectividad.', en: 'Treatment-resistant depression has not responded to at least two adequate conventional treatments. TMS is especially indicated for these cases, with high evidence of effectiveness.' },
      },
    ],
  },
  {
    key: 'tms',
    questions: [
      {
        q: 'tms.q1',
        a: { es: 'EMT/TMS es Estimulación Magnética Transcraneal. Es un tratamiento no invasivo que usa campos magnéticos para estimular áreas del cerebro involucradas en el control del ánimo. No requiere anestesia y es ambulatorio.', en: 'TMS is Transcranial Magnetic Stimulation. It\'s a non-invasive treatment that uses magnetic fields to stimulate brain areas involved in mood control. It doesn\'t require anesthesia and is outpatient.' },
      },
      {
        q: 'tms.q2',
        a: { es: 'Los efectos secundarios son mínimos: ocasionalmente dolor de cabeza leve o molestia en el cuero cabelludo que desaparece rápidamente. No tiene los efectos sistémicos de los medicamentos.', en: 'Side effects are minimal: occasionally mild headache or scalp discomfort that disappears quickly. It doesn\'t have the systemic effects of medications.' },
      },
      {
        q: 'tms.q3',
        a: { es: 'Un curso típico es de 20-30 sesiones durante 4-6 semanas, con sesiones diarias de lunes a viernes. Cada sesión dura aproximadamente 20-40 minutos.', en: 'A typical course is 20-30 sessions over 4-6 weeks, with daily sessions Monday through Friday. Each session lasts approximately 20-40 minutes.' },
      },
    ],
  },
  {
    key: 'appointments',
    questions: [
      {
        q: 'appointments.q1',
        a: { es: 'Puedes agendar contactándonos por WhatsApp o teléfono. Respondemos rápidamente para coordinar tu primera consulta de evaluación en el horario más conveniente para ti.', en: 'You can schedule by contacting us via WhatsApp or phone. We respond quickly to coordinate your first evaluation consultation at the most convenient time for you.' },
      },
      {
        q: 'appointments.q2',
        a: { es: 'Ofrecemos terapia online con la misma calidad y efectividad que la presencial, ideal para quienes tienen limitaciones geográficas, agendas complicadas o simplemente prefieren la comodidad de su hogar.', en: 'We offer online therapy with the same quality and effectiveness as in-person, ideal for those with geographic limitations, complicated schedules, or simply prefer the comfort of their home.' },
      },
    ],
  },
];

const questionLabels: Record<string, Record<string, string>> = {
  'psychotherapy.q1': { es: '¿Cuánto tiempo dura el proceso terapéutico?', en: 'How long does the therapeutic process last?' },
  'psychotherapy.q2': { es: '¿Cómo sé qué tipo de terapia necesito?', en: 'How do I know what type of therapy I need?' },
  'psychotherapy.q3': { es: '¿Son confidenciales las sesiones?', en: 'Are sessions confidential?' },
  'anxiety.q1': { es: '¿Se puede tratar la ansiedad eficazmente?', en: 'Can anxiety be effectively treated?' },
  'anxiety.q2': { es: '¿Cómo sé si tengo un trastorno de ansiedad?', en: 'How do I know if I have an anxiety disorder?' },
  'depression.q1': { es: '¿Qué tratamientos ofrecen para la depresión?', en: 'What treatments do you offer for depression?' },
  'depression.q2': { es: '¿Qué es la depresión resistente al tratamiento?', en: 'What is treatment-resistant depression?' },
  'tms.q1': { es: '¿Qué es exactamente la EMT/TMS?', en: 'What exactly is TMS?' },
  'tms.q2': { es: '¿La EMT/TMS tiene efectos secundarios?', en: 'Does TMS have side effects?' },
  'tms.q3': { es: '¿Cuántas sesiones necesito?', en: 'How many sessions do I need?' },
  'appointments.q1': { es: '¿Cómo puedo agendar una consulta?', en: 'How can I schedule an appointment?' },
  'appointments.q2': { es: '¿Ofrecen terapia online?', en: 'Do you offer online therapy?' },
};

export default function FAQ() {
  const { language, t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Hero */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <HelpCircle className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Respuestas Claras' : 'Clear Answers'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('faq.title')}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              {t('faq.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {faqCategories.map((category) => (
            <div key={category.key} className="mb-12">
              <h2 className="text-xl font-bold text-navy-900 mb-4">
                {t(`faq.${category.key}`)}
              </h2>
              <div className="space-y-3">
                {category.questions.map((item, idx) => {
                  const key = `${category.key}-${idx}`;
                  const isOpen = openIndex === key;
                  return (
                    <div
                      key={item.q}
                      className="bg-white rounded-xl shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : key)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-medium text-navy-900 pr-4">
                          {questionLabels[item.q]?.[language] || item.q}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}
                      >
                        <div className="px-6 pb-4 text-slate-600 leading-relaxed">
                          {item.a[language]}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 mb-4">
            {language === 'es' ? '¿Aún tienes preguntas?' : 'Still have questions?'}
          </h2>
          <p className="text-slate-600 mb-8">
            {language === 'es'
              ? 'Nuestro equipo está listo para responder todas tus dudas y guiarte en el proceso.'
              : 'Our team is ready to answer all your questions and guide you through the process.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a
              href="https://wa.me/522311442941?text=Hola,%20tengo%20una%20pregunta%20sobre%20sus%20servicios."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>WhatsApp</span>
            </a>
            <Link
              to="/contacto"
              className="flex items-center space-x-3 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-colors"
            >
              <span>{t('hero.cta')}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
