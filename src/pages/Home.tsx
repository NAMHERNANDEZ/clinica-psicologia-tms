import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Brain, Shield, Heart, Activity, ArrowRight, ChevronDown, Users, Award, Sparkles, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const services = [
  { key: 'anxiety', icon: Activity, color: 'bg-blue-500' },
  { key: 'depression', icon: Heart, color: 'bg-indigo-500' },
  { key: 'trauma', icon: Shield, color: 'bg-purple-500' },
  { key: 'emotional', icon: Brain, color: 'bg-teal-500' },
  { key: 'stress', icon: Clock, color: 'bg-amber-500' },
  { key: 'adhd', icon: Sparkles, color: 'bg-rose-500' },
];

const values = [
  { key: 'evidence', icon: Award },
  { key: 'ethics', icon: Shield },
  { key: 'confidentiality', icon: Heart },
  { key: 'personalized', icon: Users },
];

export default function Home() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [servicesVisible, setServicesVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => setServicesVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-navy-700/30 via-transparent to-transparent" />

          {/* Floating Elements */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-navy-500/20 rounded-full blur-3xl animate-pulse-slow" />

          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
              backgroundSize: '60px 60px'
            }} />
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
          <div className={`transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              <span className="text-teal-300 text-sm font-medium">
                {localStorage.getItem('language') === 'en' ? 'Evidence-Based Treatment' : 'Tratamiento Basado en Evidencia'}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight text-balance">
              {t('hero.title')}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
              <Link
                to="/contacto"
                className="group inline-flex items-center space-x-3 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-teal-500/25"
              >
                <span>{t('hero.cta')}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <a
                href="https://wa.me/522311442941?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20consulta."
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center space-x-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg"
              >
                <MessageCircle className="w-6 h-6" />
                <span>WhatsApp</span>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400 text-sm">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-teal-400" />
                <span>{localStorage.getItem('language') === 'es' ? 'Medicina Basada en Evidencia' : 'Evidence-Based Medicine'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-teal-400" />
                <span>{localStorage.getItem('language') === 'es' ? 'Confidencialidad Absoluta' : 'Absolute Confidentiality'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-teal-400" />
                <span>{localStorage.getItem('language') === 'es' ? 'Atención Personalizada' : 'Personalized Care'}</span>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-white/50" />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className={`transition-all duration-700 ${
              servicesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
              <span className="inline-block px-4 py-2 bg-teal-50 text-teal-700 rounded-full text-sm font-medium mb-4">
                {localStorage.getItem('language') === 'es' ? 'Servicios Especializados' : 'Specialized Services'}
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4">
                {t('services.title')}
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                {t('services.subtitle')}
              </p>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, idx) => (
              <div
                key={service.key}
                className={`group relative bg-white rounded-2xl p-8 border border-slate-100 hover:border-teal-200 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden ${
                  servicesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${idx * 50}ms` }}
              >
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${service.color}`} />

                <div className="relative z-10">
                  <div className={`w-14 h-14 ${service.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <service.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-navy-900 mb-3 group-hover:text-teal-700 transition-colors duration-200">
                    {t(`services.${service.key}`)}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    {t(`services.${service.key}Desc`).substring(0, 120)}...
                  </p>
                  <Link
                    to="/servicios"
                    className="inline-flex items-center space-x-2 text-teal-600 hover:text-teal-700 font-medium text-sm group/link"
                  >
                    <span>{t('common.learnMore')}</span>
                    <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform duration-200" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* View All CTA */}
          <div className="mt-12 text-center">
            <Link
              to="/servicios"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-navy-900/25"
            >
              <span>{t('common.viewAll')}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* TMS Section */}
      <section className="py-24 bg-gradient-to-br from-navy-50 via-white to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-100 rounded-full mb-6">
                <Brain className="w-5 h-5 text-teal-600" />
                <span className="text-teal-700 font-medium text-sm">
                  {localStorage.getItem('language') === 'es' ? 'Tecnología Avanzada' : 'Advanced Technology'}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                {t('tms.title')}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                {t('tms.whatIsDesc')}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-navy-900">{t('tms.benefit.nonInvasive')}</div>
                    <div className="text-sm text-slate-500">{t('tms.benefit.nonInvasiveDesc')}</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-navy-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-navy-900">{t('tms.benefit.outpatient')}</div>
                    <div className="text-sm text-slate-500">{t('tms.benefit.outpatientDesc')}</div>
                  </div>
                </div>
              </div>

              <Link
                to="/emt-tms"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-all duration-300"
              >
                <span>{t('common.learnMore')}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-navy-900 to-navy-800 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
                {/* Background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl" />

                {/* Brain illustration */}
                <div className="relative z-10 h-full flex items-center justify-center">
                  <div className="relative">
                    {/* Brain icon */}
                    <div className="w-40 h-40 bg-gradient-to-br from-teal-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30 animate-float">
                      <Brain className="w-20 h-20 text-white" />
                    </div>

                    {/* Magnetic field rings */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-56 h-56 border-2 border-teal-400/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="absolute w-48 h-48 border-2 border-teal-400/20 rounded-full animate-ping" style={{ animationDuration: '2.5s' }} />
                      <div className="absolute w-40 h-40 border-2 border-teal-400/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-8 left-8 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                  <span className="text-white text-sm font-medium">EMT/TMS</span>
                </div>
                <div className="absolute bottom-8 right-8 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                  <span className="text-white text-sm font-medium">{localStorage.getItem('language') === 'es' ? 'No Invasivo' : 'Non-Invasive'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values/Trust Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-navy-50 text-navy-700 rounded-full text-sm font-medium mb-4">
              {localStorage.getItem('language') === 'es' ? 'Nuestros Valores' : 'Our Values'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              {t('about.values.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div
                key={value.key}
                className="text-center p-6 rounded-2xl hover:bg-slate-50 transition-colors duration-300"
              >
                <div className="w-16 h-16 bg-navy-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-navy-700" />
                </div>
                <h3 className="text-lg font-bold text-navy-900 mb-2">
                  {t(`about.values.${value.key}`)}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {t(`about.values.${value.key}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Patient Experience */}
      <section className="py-24 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-teal-500/10 text-teal-300 rounded-full text-sm font-medium mb-4">
              {t('experience.title')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('experience.subtitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                className="relative bg-navy-800/50 rounded-2xl p-6 border border-navy-700/50 hover:border-teal-500/30 transition-colors duration-300"
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {step.toString().padStart(2, '0')}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 mt-2">
                  {t(`experience.step${step}`)}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t(`experience.step${step}Desc`)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/contacto"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-all duration-300"
            >
              <span>{t('hero.cta')}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Location/Service Area */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">
                  {localStorage.getItem('language') === 'es' ? 'Atención en Xalapa, Puebla y la región de Veracruz-Puebla' : 'Care in Xalapa, Puebla and the Veracruz-Puebla region'}
                </h3>
                <p className="text-slate-600 text-sm">
                  {localStorage.getItem('language') === 'es' ? 'Consulta presencial y en línea' : 'In-person and online consultations'}
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/522311442941?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20consulta."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors duration-300"
            >
              <MessageCircle className="w-5 h-5" />
              <span>WhatsApp: +52 231 144 2941</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
