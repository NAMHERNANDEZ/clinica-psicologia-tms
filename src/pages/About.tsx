import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Shield, Heart, Award, Users, Lock, Target, Sparkles, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const values = [
  { key: 'evidence', icon: Award },
  { key: 'ethics', icon: Shield },
  { key: 'confidentiality', icon: Lock },
  { key: 'personalized', icon: Target },
  { key: 'neuroscience', icon: Brain },
  { key: 'empathy', icon: Heart },
];

export default function About() {
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
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <Users className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Nuestra Clínica' : 'Our Clinic'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('about.title')}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              {t('hero.about.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-50 rounded-full mb-6">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <span className="text-teal-700 font-medium text-sm">
                  {t('about.mission')}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                {t('about.missionDesc')}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                {t('about.approachDesc')}
              </p>
              <Link
                to="/proceso"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-colors"
              >
                <span>{language === 'es' ? 'Conoce nuestro proceso' : 'Learn our process'}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="bg-gradient-to-br from-navy-50 to-teal-50 rounded-3xl p-8 lg:p-12">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <div className="w-12 h-12 bg-navy-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Brain className="w-6 h-6 text-navy-600" />
                  </div>
                  <div className="text-2xl font-bold text-navy-900">EMT/TMS</div>
                  <div className="text-sm text-slate-500">{language === 'es' ? 'Neuromodulación' : 'Neuromodulation'}</div>
                </div>
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="text-2xl font-bold text-navy-900">100%</div>
                  <div className="text-sm text-slate-500">{language === 'es' ? 'Confidencial' : 'Confidential'}</div>
                </div>
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-navy-900">{language === 'es' ? 'Evidencia' : 'Evidence'}</div>
                  <div className="text-sm text-slate-500">{language === 'es' ? 'Científica' : 'Based'}</div>
                </div>
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-navy-900">{language === 'es' ? 'Atención' : 'Personalized'}</div>
                  <div className="text-sm text-slate-500">{language === 'es' ? 'Personalizada' : 'Care'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              {t('about.values.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, index) => (
              <div
                key={value.key}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 bg-navy-100 rounded-xl flex items-center justify-center mb-4">
                  <value.icon className="w-7 h-7 text-navy-700" />
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

      {/* Integration */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-50 rounded-full mb-6">
              <Brain className="w-5 h-5 text-teal-600" />
              <span className="text-teal-700 font-medium text-sm">
                {language === 'es' ? 'Integración Clínica' : 'Clinical Integration'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
              {language === 'es' ? 'Psicología Clínica + Neurociencia Aplicada' : 'Clinical Psychology + Applied Neuroscience'}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              {language === 'es'
                ? 'Combinamos los modelos más efectivos de psicoterapia con tecnología de neuromodulación para ofrecer tratamientos de vanguardia que transforman vidas.'
                : 'We combine the most effective psychotherapy models with neuromodulation technology to offer cutting-edge treatments that transform lives.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/servicios"
                className="flex items-center space-x-2 px-6 py-3 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-semibold transition-colors"
              >
                <span>{t('nav.services')}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/emt-tms"
                className="flex items-center space-x-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-colors"
              >
                <span>{t('nav.tms')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
