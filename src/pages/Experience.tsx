import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ArrowRight, Clock, CheckCircle, Users, Brain, FileText, Calendar, Activity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const steps = [
  { num: '01', key: 'step1', icon: MessageCircle, color: 'bg-teal-500' },
  { num: '02', key: 'step2', icon: Calendar, color: 'bg-navy-600' },
  { num: '03', key: 'step3', icon: FileText, color: 'bg-emerald-500' },
  { num: '04', key: 'step4', icon: Brain, color: 'bg-purple-500' },
  { num: '05', key: 'step5', icon: Activity, color: 'bg-blue-500' },
  { num: '06', key: 'step6', icon: CheckCircle, color: 'bg-rose-500' },
];

export default function Experience() {
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
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <Users className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Tu Camino al Bienestar' : 'Your Path to Wellness'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('experience.title')}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              {t('experience.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Vertical Line */}
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-300 via-navy-400 to-rose-300" />

            <div className="space-y-8">
              {steps.map((step, index) => (
                <div
                  key={step.key}
                  className={`relative pl-0 md:pl-24 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {/* Step Number */}
                  <div className={`hidden md:flex absolute left-0 w-16 h-16 ${step.color} rounded-2xl items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {step.num}
                  </div>

                  {/* Card */}
                  <div className="bg-slate-50 rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-start space-x-4">
                      <div className={`md:hidden w-12 h-12 ${step.color} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}>
                        <step.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-navy-900 mb-2">
                          {t(`experience.${step.key}`)}
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          {t(`experience.${step.key}Desc`)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
          <Clock className="w-16 h-16 text-teal-400 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            {language === 'es' ? 'Comienza Hoy Mismo' : 'Start Today'}
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            {language === 'es'
              ? 'Da el primer paso hacia tu bienestar mental. Estamos aquí para acompañarte en cada etapa del proceso.'
              : 'Take the first step toward your mental wellbeing. We are here to accompany you at every stage of the process.'}
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
