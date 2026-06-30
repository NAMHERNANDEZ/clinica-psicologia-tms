import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Shield, Activity, Heart, Zap, CheckCircle, ArrowRight, MessageCircle, Award, Users, Clock, AlertTriangle, BarChart3, HelpCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const conditionsStrong = [
  { key: 'depression', desc: { es: 'Depresión resistente al tratamiento con respuesta significativa en ensayos clínicos', en: 'Treatment-resistant depression with significant response in clinical trials' } },
  { key: 'ocd', desc: { es: 'Trastorno obsesivo-compulsivo con protocolos específicos validados', en: 'Obsessive-compulsive disorder with validated specific protocols' } },
  { key: 'anxiety', desc: { es: 'Trastornos de ansiedad con evidencia sólida y creciente', en: 'Anxiety disorders with solid and growing evidence' } },
];

const conditionsResearch = [
  { key: 'adhd', desc: { es: 'Estimulación de áreas prefrontales para mejorar función ejecutiva', en: 'Stimulation of prefrontal areas to improve executive function' } },
  { key: 'bpd', desc: { es: 'Modulación de circuitos emocionales en investigación activa', en: 'Modulation of emotional circuits in active research' } },
  { key: 'ptsd', desc: { es: 'Protocolos experimentales para trauma y memoria del miedo', en: 'Experimental protocols for trauma and fear memory' } },
  { key: 'stress', desc: { es: 'Regulación de respuesta al estrés crónico y burnout', en: 'Regulation of chronic stress and burnout response' } },
  { key: 'rumination', desc: { es: 'Intervención en circuitos de rumiación y pensamiento repetitivo', en: 'Intervention in rumination and repetitive thought circuits' } },
];

const benefits = [
  { key: 'nonInvasive', icon: Shield },
  { key: 'noAnesthesia', icon: CheckCircle },
  { key: 'outpatient', icon: Activity },
  { key: 'tolerated', icon: Heart },
  { key: 'noSystemic', icon: Shield },
  { key: 'compatible', icon: Users },
];

export default function TMS() {
  const { language, t } = useLanguage();
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
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-navy-600/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <Brain className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Neuromodulación Avanzada' : 'Advanced Neuromodulation'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('tms.title')}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              {t('tms.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* What is TMS */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Animated Brain Icon */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-br from-navy-700 to-navy-800 rounded-full flex items-center justify-center shadow-xl">
                  <Brain className="w-14 h-14 text-teal-400" />
                </div>
                {/* Magnetic waves animation */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-40 border-2 border-teal-400/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-36 h-36 border-2 border-teal-400/30 rounded-full animate-ping" style={{ animationDuration: '2.5s' }} />
                  <div className="absolute w-32 h-32 border-2 border-teal-400/40 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>

            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-50 rounded-full mb-6">
              <Brain className="w-5 h-5 text-teal-600" />
              <span className="text-teal-700 font-medium text-sm">
                {language === 'es' ? 'Neurociencia Aplicada' : 'Applied Neuroscience'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
              {t('tms.whatIs')}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-4">
              {t('tms.whatIsDesc')}
            </p>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              {t('tms.howItWorksDesc')}
            </p>

            <div className="flex justify-center space-x-4">
              <a
                href="https://wa.me/522311442941?text=Hola,%20me%20interesa%20información%20sobre%20el%20tratamiento%20EMT/TMS"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{t('services.cta')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 mb-3">
              {language === 'es' ? 'Descubre Cómo Funciona la EMT/TMS' : 'Discover How TMS Works'}
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              {language === 'es'
                ? 'Mira este video explicativo para entender mejor el tratamiento de Estimulación Magnética Transcraneal.'
                : 'Watch this explanatory video to better understand Transcranial Magnetic Stimulation treatment.'}
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-navy-900">
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/fNQT-AYwCaY"
                title="TMS - Estimulación Magnética Transcraneal"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
          <div className="mt-6 text-center">
            <a
              href="https://wa.me/522311442941?text=Hola,%20me%20interesa%20información%20sobre%20el%20tratamiento%20EMT/TMS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{language === 'es' ? '¿Tienes preguntas sobre EMT/TMS?' : 'Questions about TMS?'}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Neuroplasticity */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                  {t('tms.neuroplasticity')}
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed mb-6">
                  {t('tms.neuroplasticityDesc')}
                </p>
                <Link
                  to="/servicios"
                  className="inline-flex items-center space-x-2 text-teal-600 hover:text-teal-700 font-medium"
                >
                  <span>{language === 'es' ? 'Ver servicios relacionados' : 'View related services'}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-bold text-navy-900 mb-2">
                    {language === 'es' ? 'Estimulación Dirigida' : 'Targeted Stimulation'}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {language === 'es'
                      ? 'Pulsos magnéticos focalizados activan áreas específicas del cerebro involucradas en regulación emocional.'
                      : 'Focused magnetic pulses activate specific brain areas involved in emotional regulation.'}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-navy-100 rounded-xl flex items-center justify-center mb-4">
                    <Activity className="w-6 h-6 text-navy-600" />
                  </div>
                  <h3 className="text-lg font-bold text-navy-900 mb-2">
                    {language === 'es' ? 'Nuevas Conexiones' : 'New Connections'}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {language === 'es'
                      ? 'La estimulación repetida promueve el crecimiento de nuevas conexiones neuronales funcionales.'
                      : 'Repeated stimulation promotes growth of new functional neural connections.'}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-navy-900 mb-2">
                    {language === 'es' ? 'Circuitos Equilibrados' : 'Balanced Circuits'}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {language === 'es'
                      ? 'Normaliza la actividad entre circuitos prefrontales y límbicos para mejor regulación.'
                      : 'Normalizes activity between prefrontal and limbic circuits for better regulation.'}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-navy-900 mb-2">
                    {language === 'es' ? 'Resultados Duraderos' : 'Lasting Results'}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {language === 'es'
                      ? 'Los cambios neuroplásticos persisten más allá del tratamiento activo, brindando mejoría sostenida.'
                      : 'Neuroplastic changes persist beyond active treatment, providing sustained improvement.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conditions Treated */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              {language === 'es' ? 'Aplicaciones Clínicas de EMT/TMS' : 'Clinical Applications of TMS'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Strong Evidence */}
            <div className="bg-gradient-to-br from-teal-50 to-white rounded-2xl p-8 border border-teal-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">{t('tms.conditionsStrong')}</h3>
              </div>
              <div className="space-y-4">
                {conditionsStrong.map((condition) => (
                  <div key={condition.key} className="bg-white rounded-xl p-4">
                    <h4 className="font-semibold text-navy-900 mb-1">{t(`services.${condition.key}`)}</h4>
                    <p className="text-slate-600 text-sm">{condition.desc[language]}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Research */}
            <div className="bg-gradient-to-br from-navy-50 to-white rounded-2xl p-8 border border-navy-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-navy-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">{t('tms.conditionsResearch')}</h3>
              </div>
              <div className="space-y-4">
                {conditionsResearch.map((condition) => (
                  <div key={condition.key} className="bg-white rounded-xl p-4">
                    <h4 className="font-semibold text-navy-900 mb-1">
                      {condition.key === 'rumination'
                        ? (language === 'es' ? 'Rumiación' : 'Rumination')
                        : t(`services.${condition.key}`)}
                    </h4>
                    <p className="text-slate-600 text-sm">{condition.desc[language]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('tms.benefits')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.key}
                className="bg-navy-800/50 rounded-2xl p-6 border border-navy-700/50 hover:border-teal-500/30 transition-colors"
              >
                <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t(`tms.benefit.${benefit.key}`)}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t(`tms.benefit.${benefit.key}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration with Psychotherapy */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-50 rounded-full mb-6">
              <Users className="w-5 h-5 text-teal-600" />
              <span className="text-teal-700 font-medium text-sm">
                {language === 'es' ? 'Enfoque Integrado' : 'Integrated Approach'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
              {t('tms.integration')}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              {t('tms.integrationDesc')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <a
                href="https://wa.me/522311442941?text=Hola,%20me%20interesa%20saber%20más%20sobre%20la%20combinación%20de%20EMT/TMS%20con%20psicoterapia"
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
        </div>
      </section>

      {/* Más Información EMT/TMS */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-50 rounded-full mb-6">
              <HelpCircle className="w-5 h-5 text-teal-600" />
              <span className="text-teal-700 font-medium text-sm">
                {language === 'es' ? 'Más Información' : 'More Information'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              {language === 'es' ? 'Todo lo que necesitas saber sobre EMT/TMS' : 'Everything you need to know about TMS'}
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              {language === 'es'
                ? 'Resolvemos tus dudas con información clara, respaldada por evidencia científica.'
                : 'We answer your questions with clear information, backed by scientific evidence.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ¿Qué es? */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">
                  {language === 'es' ? '¿Qué es la EMT/TMS?' : 'What is TMS?'}
                </h3>
              </div>
              <div className="space-y-4 text-slate-600">
                <p>
                  {language === 'es'
                    ? 'La Estimulación Magnética Transcraneal (EMT/TMS) es una técnica de neuromodulación no invasiva aprobada por la FDA.'
                    : 'Transcranial Magnetic Stimulation (TMS) is a non-invasive neuromodulation technique approved by the FDA.'}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>{language === 'es' ? 'Usa pulsos magnéticos para estimular áreas específicas del cerebro' : 'Uses magnetic pulses to stimulate specific brain areas'}</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>{language === 'es' ? 'Sin cirugía, sin anestesia, sin dolor' : 'No surgery, no anesthesia, no pain'}</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>{language === 'es' ? 'Más de 1 millón de tratamientos realizados mundialmente' : 'Over 1 million treatments performed worldwide'}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ¿Para qué sirve? */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-navy-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">
                  {language === 'es' ? '¿Para qué sirve?' : 'What is it for?'}
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: language === 'es' ? 'Depresión mayor' : 'Major Depression', evidence: language === 'es' ? 'Alta evidencia' : 'High evidence' },
                  { label: language === 'es' ? 'Ansiedad generalizada' : 'Generalized Anxiety', evidence: language === 'es' ? 'Alta evidencia' : 'High evidence' },
                  { label: 'TOC', evidence: language === 'es' ? 'Alta evidencia' : 'High evidence' },
                  { label: 'TEPT', evidence: language === 'es' ? 'Alta evidencia' : 'High evidence' },
                  { label: language === 'es' ? 'Migraña crónica' : 'Chronic Migraine', evidence: language === 'es' ? 'Alta evidencia' : 'High evidence' },
                  { label: 'Tinnitus', evidence: language === 'es' ? 'Evidencia moderada' : 'Moderate evidence' },
                  { label: language === 'es' ? 'Dolor neuropático' : 'Neuropathic Pain', evidence: language === 'es' ? 'Evidencia moderada' : 'Moderate evidence' },
                  { label: language === 'es' ? 'Tabaquismo' : 'Smoking Cessation', evidence: language === 'es' ? 'Evidencia moderada' : 'Moderate evidence' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                    <span className="font-medium text-navy-900 text-sm">{item.label}</span>
                    <span className="text-xs px-2 py-1 bg-teal-100 text-teal-700 rounded-full">{item.evidence}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ¿Es seguro? */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">
                  {language === 'es' ? '¿Es seguro?' : 'Is it safe?'}
                </h3>
              </div>
              <div className="space-y-4 text-slate-600">
                <p className="font-medium text-navy-900">
                  {language === 'es' ? 'Sí, es un tratamiento seguro y aprobado por la FDA.' : 'Yes, it is a safe and FDA-approved treatment.'}
                </p>
                <div>
                  <p className="font-medium text-sm text-navy-900 mb-2">
                    {language === 'es' ? 'Efectos secundarios (leves y temporales):' : 'Side effects (mild and temporary):'}
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0" />
                      <span>{language === 'es' ? 'Molestia leve en el cuero cabelludo' : 'Mild scalp discomfort'}</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0" />
                      <span>{language === 'es' ? 'Cefalea transitoria' : 'Transient headache'}</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-sm text-navy-900 mb-2">
                    {language === 'es' ? 'Contraindicaciones:' : 'Contraindications:'}
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{language === 'es' ? 'Implantes metálicos en el cráneo' : 'Metal implants in the skull'}</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{language === 'es' ? 'Marcapasos o dispositivos electrónicos' : 'Pacemakers or electronic devices'}</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{language === 'es' ? 'Epilepsia no controlada' : 'Uncontrolled epilepsy'}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ¿Cómo es el procedimiento? */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">
                  {language === 'es' ? '¿Cómo es el procedimiento?' : 'How does the procedure work?'}
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: '1', title: language === 'es' ? 'Evaluación inicial' : 'Initial evaluation', desc: language === 'es' ? 'Consulta de 30-45 min para evaluar tu caso y determinar si EMT/TMS es adecuado para ti.' : '30-45 min consultation to evaluate your case and determine if TMS is right for you.' },
                  { step: '2', title: language === 'es' ? 'Sesiones de tratamiento' : 'Treatment sessions', desc: language === 'es' ? '20-30 min por sesión, de lunes a viernes, durante 4-6 semanas.' : '20-30 min per session, Monday through Friday, for 4-6 weeks.' },
                  { step: '3', title: language === 'es' ? 'Resultados progresivos' : 'Progressive results', desc: language === 'es' ? 'Mejoría visible desde la 2ª-3ª semana de tratamiento.' : 'Visible improvement from the 2nd-3rd week of treatment.' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy-900">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="mt-12 bg-gradient-to-br from-navy-900 to-navy-800 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-6">
              {language === 'es' ? 'Resultados Comprobados' : 'Proven Results'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">60-70%</div>
                <p className="text-slate-300 text-sm">
                  {language === 'es' ? 'de pacientes mejoran significativamente' : 'of patients improve significantly'}
                </p>
              </div>
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">30-40%</div>
                <p className="text-slate-300 text-sm">
                  {language === 'es' ? 'alcanzan remisión completa' : 'achieve complete remission'}
                </p>
              </div>
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">2-3</div>
                <p className="text-slate-300 text-sm">
                  {language === 'es' ? 'semanas para ver mejoría' : 'weeks to see improvement'}
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-navy-900 mb-6 text-center">
              {language === 'es' ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { q: language === 'es' ? '¿Duele el tratamiento?' : 'Does the treatment hurt?', a: language === 'es' ? 'No, solo se siente una leve presión o "click" en el cuero cabelludo. Es indoloro.' : 'No, you only feel mild pressure or a "click" on the scalp. It is painless.' },
                { q: language === 'es' ? '¿Puedo manejar después de la sesión?' : 'Can I drive after the session?', a: language === 'es' ? 'Sí, puedes retomar tus actividades normales inmediatamente, incluyendo manejar.' : 'Yes, you can resume your normal activities immediately, including driving.' },
                { q: language === 'es' ? '¿Cuánto dura cada sesión?' : 'How long does each session last?', a: language === 'es' ? 'Cada sesión dura entre 20-30 minutos. El total del tratamiento es de 4-6 semanas.' : 'Each session lasts 20-30 minutes. The total treatment is 4-6 weeks.' },
                { q: language === 'es' ? '¿Cuándo empiezo a ver resultados?' : 'When do I start seeing results?', a: language === 'es' ? 'La mayoría de los pacientesNot found: LanguageContext.tsx' : 'Most patients start noticing improvements from the 2nd-3rd week.' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <h4 className="font-semibold text-navy-900 mb-2 flex items-start space-x-2">
                    <HelpCircle className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>{item.q}</span>
                  </h4>
                  <p className="text-slate-600 text-sm ml-7">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
