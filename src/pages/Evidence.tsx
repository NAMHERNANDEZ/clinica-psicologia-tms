import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Globe, Award, Activity, ArrowRight, FileText, TrendingUp, Clock, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const stats = [
  { key: 'years', icon: Clock, color: 'bg-navy-600' },
  { key: 'publications', icon: BookOpen, color: 'bg-teal-600' },
  { key: 'clinical', icon: Globe, color: 'bg-emerald-600' },
  { key: 'protocols', icon: Activity, color: 'bg-cyan-600' },
];

const milestones = [
  { year: '1985', title: { en: 'TMS Development', es: 'Desarrollo de EMT' }, desc: { en: 'First successful TMS experiments conducted', es: 'Primeros experimentos exitosos de EMT realizados' } },
  { year: '1990s', title: { en: 'Research Expansion', es: 'Expansión de Investigación' }, desc: { en: 'Widespread scientific research begins globally', es: 'Investigación científica generalizada comienza globalmente' } },
  { year: '2008', title: { en: 'First FDA Clearance', es: 'Primera Aprobación FDA' }, desc: { en: 'FDA clears TMS for treatment-resistant depression', es: 'FDA aprueba EMT para depresión resistente al tratamiento' } },
  { year: '2013', title: { en: 'Broader Adoption', es: 'Adopción Más Amplia' }, desc: { en: 'Insurance coverage expands for TMS treatment', es: 'Cobertura de seguro se expande para tratamiento EMT' } },
  { year: '2018', title: { en: 'OCD Clearance', es: 'Aprobación para TOC' }, desc: { en: 'FDA clears TMS for obsessive-compulsive disorder', es: 'FDA aprueba EMT para trastorno obsesivo-compulsivo' } },
  { year: '2020s', title: { en: 'Expanded Applications', es: 'Aplicaciones Expandidas' }, desc: { en: 'Research expands to multiple neurological conditions', es: 'Investigación se expande a múltiples condiciones neurológicas' } },
];

export default function Evidence() {
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
          <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-navy-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <BookOpen className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'en' ? 'Peer-Reviewed Research' : 'Investigación Revisada por Pares'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('evidence.title')}
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              {t('evidence.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.key}
                className="text-center"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-16 h-16 ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-navy-900 mb-1">
                  {t(`evidence.${stat.key}`)}
                </div>
                <div className="text-gray-500">
                  {t(`evidence.${stat.key}Desc`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research History */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                {t('evidence.sections.history')}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                {t('evidence.sections.historyDesc')}
              </p>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-navy-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-navy-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900 text-lg mb-1">
                      {language === 'en' ? 'Robust Clinical Trials' : 'Ensayos Clínicos Robustos'}
                    </h3>
                    <p className="text-gray-600">
                      {language === 'en'
                        ? 'Multiple randomized controlled trials demonstrate TMS efficacy for depression, with response rates significantly higher than sham treatment.'
                        : 'Múltiples ensayos controlados aleatorizados demuestran la eficacia de EMT para depresión, con tasas de respuesta significativamente mayores que el tratamiento simulado.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900 text-lg mb-1">
                      {language === 'en' ? 'Growing Evidence Base' : 'Base de Evidencia Creciente'}
                    </h3>
                    <p className="text-gray-600">
                      {language === 'en'
                        ? 'Research publications on TMS have increased exponentially, with thousands of new studies published each year.'
                        : 'Las publicaciones de investigación sobre EMT han aumentado exponencialmente, con miles de nuevos estudios publicados cada año.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900 text-lg mb-1">
                      {language === 'en' ? 'Real-World Effectiveness' : 'Eficacia en el Mundo Real'}
                    </h3>
                    <p className="text-gray-600">
                      {language === 'en'
                        ? 'Beyond clinical trials, real-world data from thousands of patients confirms TMS effectiveness in everyday practice.'
                        : 'Más allá de ensayos clínicos, datos del mundo real de miles de pacientes confirman la efectividad de EMT en la práctica cotidiana.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-8">
                {milestones.map((milestone) => (
                  <div key={milestone.year} className="relative pl-20">
                    <div className="absolute left-5 w-6 h-6 bg-white border-2 border-navy-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-navy-600 rounded-full" />
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="text-sm font-semibold text-teal-600 mb-1">{milestone.year}</div>
                      <h3 className="text-lg font-bold text-navy-900 mb-2">{milestone.title[language]}</h3>
                      <p className="text-gray-600 text-sm">{milestone.desc[language]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FDA Clearances */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              {t('evidence.sections.fda')}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {t('evidence.sections.fdaDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-navy-50 to-gray-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-navy-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-semibold text-teal-600 mb-2">2008</div>
              <h3 className="text-xl font-bold text-navy-900 mb-3">
                {language === 'en' ? 'Treatment-Resistant Depression' : 'Depresión Resistente al Tratamiento'}
              </h3>
              <p className="text-gray-600 text-sm">
                {language === 'en'
                  ? 'First FDA clearance for TMS as a treatment for patients who have not responded to antidepressant medications.'
                  : 'Primera aprobación de FDA para EMT como tratamiento para pacientes que no han respondido a medicamentos antidepresivos.'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-semibold text-teal-600 mb-2">2018</div>
              <h3 className="text-xl font-bold text-navy-900 mb-3">
                {language === 'en' ? 'Obsessive-Compulsive Disorder' : 'Trastorno Obsesivo-Compulsivo'}
              </h3>
              <p className="text-gray-600 text-sm">
                {language === 'en'
                  ? 'FDA clearance expanded to include OCD treatment using specialized Theta Burst protocols.'
                  : 'Aprobación FDA ampliada para incluir tratamiento de TOC usando protocolos especializados de Theta Burst.'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-semibold text-teal-600 mb-2">Ongoing</div>
              <h3 className="text-xl font-bold text-navy-900 mb-3">
                {language === 'en' ? 'Expanded Indications' : 'Indicaciones Expandidas'}
              </h3>
              <p className="text-gray-600 text-sm">
                {language === 'en'
                  ? 'Research continues for anxiety, PTSD, chronic pain, cognitive enhancement, and neurorehabilitation.'
                  : 'La investigación continúa para ansiedad, TEPT, dolor crónico, mejoramiento cognitivo y neurorehabilitación.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Applications */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-xl font-bold text-navy-900 mb-6">
                  {language === 'en' ? 'Conditions with Strong Evidence' : 'Condiciones con Evidencia Sólida'}
                </h3>
                <div className="space-y-4">
                  {[
                    { name: language === 'en' ? 'Major Depressive Disorder' : 'Trastorno Depresivo Mayor', level: 95 },
                    { name: language === 'en' ? 'Treatment-Resistant Depression' : 'Depresión Resistente al Tratamiento', level: 90 },
                    { name: language === 'en' ? 'Obsessive-Compulsive Disorder' : 'Trastorno Obsesivo-Compulsivo', level: 85 },
                    { name: language === 'en' ? 'Migraine (Acute & Prevention)' : 'Migraña (Agudo y Prevención)', level: 80 },
                    { name: language === 'en' ? 'Anxiety Disorders' : 'Trastornos de Ansiedad', level: 70 },
                    { name: language === 'en' ? 'Post-Traumatic Stress Disorder' : 'Trastorno de Estrés Postraumático', level: 65 },
                  ].map((condition, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700 font-medium">{condition.name}</span>
                        <span className="text-sm text-teal-600 font-semibold">{condition.level}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-1000"
                          style={{ width: `${condition.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-6">
                  {language === 'en'
                    ? 'Evidence strength based on meta-analyses and systematic reviews'
                    : 'Fuerza de evidencia basada en metaanálisis y revisiones sistemáticas'}
                </p>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                {t('evidence.sections.clinical')}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                {t('evidence.sections.clinicalDesc')}
              </p>
              <p className="text-gray-600 leading-relaxed">
                {language === 'en'
                  ? 'Clinical research has established TMS as a viable treatment option across multiple psychiatric and neurological conditions. The strongest evidence exists for depression, particularly in patients who have not responded adequately to medication. Ongoing research continues to expand our understanding of optimal protocols and patient selection criteria.'
                  : 'La investigación clínica ha establecido a la EMT como una opción de tratamiento viable en múltiples condiciones psiquiátricas y neurológicas. La evidencia más sólida existe para la depresión, particularmente en pacientes que no han respondido adecuadamente a la medicación. La investigación continua expands nuestro entendimiento de protocolos óptimos y criterios de selección de pacientes.'}
              </p>
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
            {language === 'en' ? 'Learn More About TMS' : 'Conozca Más Sobre EMT'}
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            {language === 'en'
              ? 'Discover how evidence-based TMS treatment can help you or your loved ones.'
              : 'Descubra cómo el tratamiento EMT basado en evidencia puede ayudarle a usted o sus seres queridos.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/about"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold transition-all duration-300"
            >
              <span>{t('nav.about')}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/conditions"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all duration-300 border border-white/20"
            >
              <span>{t('nav.conditions')}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
