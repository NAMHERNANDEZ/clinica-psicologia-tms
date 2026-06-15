import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Heart, Shield, Brain, Clock, Sparkles, Users, FileText, Globe, Briefcase, ArrowRight, Phone, MessageCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const services = [
  { key: 'anxiety', icon: Activity, color: 'bg-blue-500', lightBg: 'bg-blue-50' },
  { key: 'depression', icon: Heart, color: 'bg-indigo-500', lightBg: 'bg-indigo-50' },
  { key: 'trauma', icon: Shield, color: 'bg-purple-500', lightBg: 'bg-purple-50' },
  { key: 'emotional', icon: Brain, color: 'bg-teal-500', lightBg: 'bg-teal-50' },
  { key: 'stress', icon: Clock, color: 'bg-amber-500', lightBg: 'bg-amber-50' },
  { key: 'adhd', icon: Sparkles, color: 'bg-rose-500', lightBg: 'bg-rose-50' },
  { key: 'bpd', icon: Heart, color: 'bg-pink-500', lightBg: 'bg-pink-50' },
  { key: 'ocd', icon: Shield, color: 'bg-emerald-500', lightBg: 'bg-emerald-50' },
  { key: 'evaluation', icon: FileText, color: 'bg-navy-500', lightBg: 'bg-navy-50' },
  { key: 'online', icon: Globe, color: 'bg-cyan-500', lightBg: 'bg-cyan-50' },
  { key: 'executive', icon: Briefcase, color: 'bg-slate-600', lightBg: 'bg-slate-50' },
];

export default function Services() {
  const { language, t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Hero */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <Activity className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Tratamientos Especializados' : 'Specialized Treatments'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('services.title')}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              {t('services.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div
                key={service.key}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${
                  selectedService === service.key ? 'ring-2 ring-teal-500' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setSelectedService(selectedService === service.key ? null : service.key)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 ${service.color} rounded-xl flex items-center justify-center`}>
                      <service.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className={`transition-transform duration-300 ${selectedService === service.key ? 'rotate-180' : ''}`}>
                      <ArrowRight className="w-5 h-5 text-slate-400 rotate-90" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-navy-900 mb-2">
                    {t(`services.${service.key}`)}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {selectedService === service.key
                      ? t(`services.${service.key}Desc`)
                      : `${t(`services.${service.key}Desc`).substring(0, 100)}...`}
                  </p>
                </div>

                {selectedService === service.key && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                    <div className="flex space-x-3">
                      <a
                        href={`https://wa.me/522311442941?text=Hola,%20me%20interesa%20información%20sobre%20el%20tratamiento%20de%20${encodeURIComponent(t(`services.${service.key}`))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center space-x-2 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>{t('services.cta')}</span>
                      </a>
                      <a
                        href="tel:+522311442941"
                        className="flex items-center justify-center w-12 bg-navy-100 hover:bg-navy-200 text-navy-700 rounded-xl transition-colors"
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Approach */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                {language === 'es' ? 'Nuestro Enfoque Terapéutico' : 'Our Therapeutic Approach'}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                {language === 'es'
                  ? 'Cada tratamiento es diseñado específicamente para tus necesidades, combinando las técnicas más efectivas respaldadas por la investigación científica actual.'
                  : 'Each treatment is specifically designed for your needs, combining the most effective techniques backed by current scientific research.'}
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900">
                      {language === 'es' ? 'Terapia Cognitivo-Conductual (TCC)' : 'Cognitive-Behavioral Therapy (CBT)'}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {language === 'es'
                        ? 'Protocolos estructurados para modificar patrones de pensamiento y comportamiento.'
                        : 'Structured protocols to modify thought and behavior patterns.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900">
                      {language === 'es' ? 'Terapia Dialéctico-Conductual (DBT)' : 'Dialectical Behavior Therapy (DBT)'}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {language === 'es'
                        ? 'Habilidades de regulación emocional para condiciones complejas.'
                        : 'Emotional regulation skills for complex conditions.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900">EMDR</h3>
                    <p className="text-slate-600 text-sm">
                      {language === 'es'
                        ? 'Desensibilización y reprocesamiento para trauma y experiencias adversas.'
                        : 'Desensitization and reprocessing for trauma and adverse experiences.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900">
                      {language === 'es' ? 'Neuromodulación (EMT/TMS)' : 'Neuromodulation (TMS)'}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {language === 'es'
                        ? 'Estimulación cerebral no invasiva para condiciones resistentes.'
                        : 'Non-invasive brain stimulation for resistant conditions.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-navy-50 to-teal-50 rounded-3xl p-8 lg:p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-navy-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-teal-400" />
                </div>
                <h3 className="text-2xl font-bold text-navy-900 mb-4">
                  {language === 'es' ? 'Atención Individualizada' : 'Individualized Care'}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {language === 'es'
                    ? 'Desarrollamos un plan de tratamiento único basado en tu evaluación clínica integral, considerando tus necesidades específicas y objetivos personales.'
                    : 'We develop a unique treatment plan based on your comprehensive clinical evaluation, considering your specific needs and personal goals.'}
                </p>
                <Link
                  to="/contacto"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-colors"
                >
                  <span>{t('hero.cta')}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
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
            {language === 'es' ? 'Comienza tu Proceso de Transformación' : 'Begin Your Transformation Process'}
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            {language === 'es'
              ? 'Da el primer paso hacia tu bienestar mental. Nuestro equipo está listo para acompañarte.'
              : 'Take the first step toward your mental wellbeing. Our team is ready to accompany you.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a
              href="https://wa.me/522311442941?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20consulta."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
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
