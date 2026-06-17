import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Heart, Activity, Brain, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const conditions = [
  {
    key: 'depression',
    icon: Heart,
    color: 'bg-rose-500',
    lightBg: 'bg-rose-50',
    lightText: 'text-rose-600',
    description: { en: 'Major depressive disorder affects millions worldwide. TMS targets the dorsolateral prefrontal cortex, a brain region often underactive in depression, helping restore healthy mood regulation.', es: 'El trastorno depresivo mayor afecta a millones en todo el mundo. La EMT dirige el córtex prefrontal dorsolateral, una región cerebral frecuentemente hipoactiva en la depresión, ayudando a restaurar la regulación saludable del estado de ánimo.' },
  },
  {
    key: 'trd',
    icon: Activity,
    color: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    lightText: 'text-orange-600',
    description: { en: "For patients who haven't responded adequately to antidepressant medications, TMS offers an FDA-cleared alternative with proven efficacy for treatment-resistant cases.", es: 'Para pacientes que no han respondido adecuadamente a medicamentos antidepresivos, la EMT ofrece una alternativa aprobada por la FDA con eficacia comprobada para casos resistentes al tratamiento.' },
  },
  {
    key: 'anxiety',
    icon: Brain,
    color: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    lightText: 'text-amber-600',
    description: { en: 'Generalized anxiety disorder and other anxiety conditions can be addressed through TMS by targeting neural circuits involved in worry and fear responses.', es: 'El trastorno de ansiedad generalizada y otras condiciones de ansiedad pueden abordarse mediante EMT dirigiendo circuitos neuronales involucrados en respuestas de preocupación y miedo.' },
  },
  {
    key: 'ocd',
    icon: Shield,
    color: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    lightText: 'text-emerald-600',
    description: { en: 'Obsessive-compulsive disorder responds to TMS treatment targeting the cortico-striatal-thalamic circuit, helping reduce intrusive thoughts and compulsive behaviors.', es: 'El trastorno obsesivo-compulsivo responde al tratamiento EMT dirigiendo el circuito córtico-estriatal-talámico, ayudando a reducir pensamientos intrusivos y comportamientos compulsivos.' },
  },
  {
    key: 'ptsd',
    icon: Heart,
    color: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    lightText: 'text-purple-600',
    description: { en: 'Post-traumatic stress disorder can be treated with TMS targeting brain regions involved in fear memory and emotional regulation, offering hope for trauma survivors.', es: 'El trastorno de estrés postraumático puede tratarse con EMT dirigiendo regiones cerebrales involucradas en la memoria del miedo y la regulación emocional.' },
  },
  {
    key: 'adhd',
    icon: Activity,
    color: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-600',
    description: { en: 'Attention deficit hyperactivity disorder may benefit from TMS targeting the prefrontal cortex to improve executive function, attention, and impulse control.', es: 'El trastorno por déficit de atención con hiperactividad puede beneficiarse de EMT dirigiendo el córtex prefrontal para mejorar la función ejecutiva, atención y control de impulsos.' },
  },
  {
    key: 'insomnia',
    icon: Brain,
    color: 'bg-indigo-500',
    lightBg: 'bg-indigo-50',
    lightText: 'text-indigo-600',
    description: { en: 'Sleep disorders including chronic insomnia can be addressed through TMS by regulating brain areas involved in the sleep-wake cycle.', es: 'Los trastornos del sueño incluyendo insomnio crónico pueden abordarse mediante EMT regulando áreas cerebrales involucradas en el ciclo sueño-vigilia.' },
  },
  {
    key: 'migraine',
    icon: Activity,
    color: 'bg-pink-500',
    lightBg: 'bg-pink-50',
    lightText: 'text-pink-600',
    description: { en: 'Migraine attacks can be reduced in frequency and intensity through TMS, with FDA clearance for both acute treatment and prevention.', es: 'Los ataques de migraña pueden reducirse en frecuencia e intensidad mediante EMT, con aprobación de la FDA tanto para tratamiento agudo como prevención.' },
  },
  {
    key: 'chronicPain',
    icon: Heart,
    color: 'bg-red-500',
    lightBg: 'bg-red-50',
    lightText: 'text-red-600',
    description: { en: 'Chronic pain syndromes can be modulated through TMS targeting motor cortex areas involved in pain processing pathways.', es: 'Los síndromes de dolor crónico pueden modularse mediante EMT dirigiendo áreas del córtex motor involucradas en vías de procesamiento del dolor.' },
  },
  {
    key: 'fibromyalgia',
    icon: Activity,
    color: 'bg-cyan-500',
    lightBg: 'bg-cyan-50',
    lightText: 'text-cyan-600',
    description: { en: "Fibromyalgia's widespread pain and fatigue symptoms may improve with TMS treatment targeting pain perception networks.", es: 'Los síntomas de dolor generalizado y fatiga de la fibromialgia pueden mejorar con tratamiento EMT dirigiendo redes de percepción del dolor.' },
  },
  {
    key: 'cognitive',
    icon: Brain,
    color: 'bg-teal-500',
    lightBg: 'bg-teal-50',
    lightText: 'text-teal-600',
    description: { en: 'Cognitive rehabilitation following brain injury or neurological conditions can be enhanced with TMS promoting neuroplasticity.', es: 'La rehabilitación cognitiva después de lesión cerebral o condiciones neurológicas puede mejorarse con EMT promoviendo la neuroplasticidad.' },
  },
  {
    key: 'mci',
    icon: Shield,
    color: 'bg-lime-500',
    lightBg: 'bg-lime-50',
    lightText: 'text-lime-600',
    description: { en: 'Mild cognitive impairment may be slowed or improved through TMS stimulating areas involved in memory and executive function.', es: 'El deterioro cognitivo leve puede retardarse o mejorarse mediante EMT estimulando áreas involucradas en memoria y función ejecutiva.' },
  },
  {
    key: 'parkinsons',
    icon: Activity,
    color: 'bg-fuchsia-500',
    lightBg: 'bg-fuchsia-50',
    lightText: 'text-fuchsia-600',
    description: { en: "Parkinson's disease symptoms including motor function and mood can be addressed through targeted TMS protocols.", es: 'Los síntomas de la enfermedad de Parkinson incluyendo función motora y estado de ánimo pueden abordarse mediante protocolos EMT específicos.' },
  },
  {
    key: 'stroke',
    icon: Brain,
    color: 'bg-violet-500',
    lightBg: 'bg-violet-50',
    lightText: 'text-violet-600',
    description: { en: 'Stroke rehabilitation can be accelerated with TMS promoting cortical reorganization and functional recovery.', es: 'La rehabilitación post-AVC puede acelerarse con EMT promoviendo la reorganización cortical y recuperación funcional.' },
  },
  {
    key: 'tinnitus',
    icon: Activity,
    color: 'bg-sky-500',
    lightBg: 'bg-sky-50',
    lightText: 'text-sky-600',
    description: { en: 'Chronic tinnitus perception can be modulated through TMS targeting auditory and associated cortical areas.', es: 'La percepción crónica de tinnitus puede modularse mediante EMT dirigiendo áreas auditivas y corticales asociadas.' },
  },
  {
    key: 'addiction',
    icon: Heart,
    color: 'bg-rose-600',
    lightBg: 'bg-rose-50',
    lightText: 'text-rose-600',
    description: { en: 'Addiction disorders may benefit from TMS targeting reward circuits and prefrontal control regions to support recovery.', es: 'Los trastornos de adicción pueden beneficiarse de EMT dirigiendo circuitos de recompensa y regiones de control prefrontal para apoyar la recuperación.' },
  },
  {
    key: 'eating',
    icon: Shield,
    color: 'bg-orange-600',
    lightBg: 'bg-orange-50',
    lightText: 'text-orange-600',
    description: { en: 'Eating disorders involve brain circuits that can be modulated with TMS to support healthier relationships with food and body image.', es: 'Los trastornos alimentarios involucran circuitos cerebrales que pueden modularse con EMT para apoyar relaciones más saludables con la comida e imagen corporal.' },
  },
];

export default function Conditions() {
  const { language, t } = useLanguage();
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
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
          <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <Activity className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'en' ? 'Evidence-Based Treatment' : 'Tratamiento Basado en Evidencia'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('conditions.title')}
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              {t('conditions.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Disclaimer Banner */}
      <section className="bg-amber-50 border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{t('conditions.disclaimer')}</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Conditions Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {conditions.map((condition, index) => (
              <div
                key={condition.key}
                onClick={() => setSelectedCondition(selectedCondition === condition.key ? null : condition.key)}
                className={`bg-white rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                  selectedCondition === condition.key
                    ? 'ring-2 ring-teal-500 shadow-xl'
                    : 'shadow-sm hover:shadow-lg'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 ${condition.color} rounded-xl flex items-center justify-center`}>
                    <condition.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className={`transition-transform duration-300 ${selectedCondition === condition.key ? 'rotate-180' : ''}`}>
                    <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-2">
                  {t(`condition.${condition.key}`)}
                </h3>
                <div className={`overflow-hidden transition-all duration-300 ${
                  selectedCondition === condition.key ? 'max-h-40 mt-3' : 'max-h-0'
                }`}>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {condition.description[language]}
                  </p>
                </div>
                {selectedCondition !== condition.key && (
                  <p className="text-teal-600 text-sm font-medium mt-3 flex items-center space-x-1">
                    <span>{t('common.learnMore')}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How TMS Helps */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                {language === 'en' ? 'How TMS Helps Multiple Conditions' : 'Cómo la EMT Ayuda en Múltiples Condiciones'}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                {language === 'en'
                  ? 'Transcranial Magnetic Stimulation works by modulating neural activity in specific brain regions. Different conditions involve different brain networks, and TMS protocols can be tailored to target the areas most relevant to each patient\'s needs.'
                  : 'La Estimulación Magnética Transcraneal funciona modulando la actividad neural en regiones específicas del cerebro. Diferentes condiciones involucran diferentes redes cerebrales, y los protocolos de EMT pueden adaptarse para dirigir las áreas más relevantes para las necesidades de cada paciente.'}
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-teal-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    {language === 'en'
                      ? 'Personalized treatment protocols based on individual diagnosis'
                      : 'Protocolos de tratamiento personalizados según diagnóstico individual'}
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-teal-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    {language === 'en'
                      ? 'Non-systemic treatment with minimal side effects'
                      : 'Tratamiento no sistémico con efectos secundarios mínimos'}
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-teal-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    {language === 'en'
                      ? 'Can be combined with other treatments for enhanced outcomes'
                      : 'Puede combinarse con otros tratamientos para mejores resultados'}
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-teal-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    {language === 'en'
                      ? 'Evidence-based approach supported by clinical research'
                      : 'Enfoque basado en evidencia respaldado por investigación clínica'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-navy-50 to-gray-100 rounded-3xl p-8 lg:p-12">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <Zap className="w-10 h-10 text-teal-600 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-navy-900">Targeted</div>
                  <div className="text-sm text-gray-500">Stimulation</div>
                </div>
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <Brain className="w-10 h-10 text-navy-600 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-navy-900">Neural</div>
                  <div className="text-sm text-gray-500">Modulation</div>
                </div>
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <Activity className="w-10 h-10 text-teal-600 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-navy-900">Adaptive</div>
                  <div className="text-sm text-gray-500">Protocols</div>
                </div>
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <Shield className="w-10 h-10 text-navy-600 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-navy-900">Safe</div>
                  <div className="text-sm text-gray-500">& Effective</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            {language === 'en' ? 'Find Out If TMS Can Help You' : 'Descubra Si la EMT Puede Ayudarle'}
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            {language === 'en'
              ? 'Schedule a consultation to discuss your specific condition and treatment options.'
              : 'Programe una consulta para discutir su condición específica y opciones de tratamiento.'}
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-teal-500/25"
          >
            <span>{t('hero.cta')}</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
