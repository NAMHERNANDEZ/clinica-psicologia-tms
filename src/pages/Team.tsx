import { useState, useEffect } from 'react';
import { Brain, Heart, Users, Award, GraduationCap, Stethoscope, Phone, MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const specialties = [
  {
    key: 'psychiatry',
    icon: Stethoscope,
    color: 'bg-navy-600',
    lightBg: 'bg-navy-50',
    lightText: 'text-navy-600',
    description: {
      en: 'Our psychiatrists specialize in neuromodulation and treatment-resistant psychiatric conditions, bringing decades of experience in brain stimulation therapies.',
      es: 'Nuestros psiquiatras se especializan en neuromodulación y condiciones psiquiátricas resistentes al tratamiento, aportando décadas de experiencia en terapias de estimulación cerebral.',
    },
  },
  {
    key: 'psychology',
    icon: Heart,
    color: 'bg-teal-600',
    lightBg: 'bg-teal-50',
    lightText: 'text-teal-600',
    description: {
      en: 'Clinical psychologists provide comprehensive mental health assessments and integrative therapy approaches alongside TMS treatment.',
      es: 'Los psicólogos clínicos proporcionan evaluaciones integrales de salud mental y enfoques terapéuticos integrativos junto con el tratamiento EMT.',
    },
  },
  {
    key: 'neuropsychology',
    icon: Brain,
    color: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
    lightText: 'text-emerald-600',
    description: {
      en: 'Neuropsychologists conduct detailed cognitive assessments and develop personalized treatment protocols based on individual brain profiles.',
      es: 'Los neuropsicólogos realizan evaluaciones cognitivas detalladas y desarrollan protocolos de tratamiento personalizados basados en perfiles cerebrales individuales.',
    },
  },
  {
    key: 'neuromodulation',
    icon: Award,
    color: 'bg-cyan-600',
    lightBg: 'bg-cyan-50',
    lightText: 'text-cyan-600',
    description: {
      en: 'TMS specialists trained in the latest neuromodulation techniques ensure optimal treatment delivery and safety throughout your therapy.',
      es: 'Especialistas en EMT capacitados en las últimas técnicas de neuromodulación garantizan la administración óptima y seguridad durante su terapia.',
    },
  },
];

const values = [
  {
    title: { en: 'Patient-Centered Care', es: 'Atención Centrada en el Paciente' },
    desc: { en: 'Every treatment plan is tailored to individual needs and goals', es: 'Cada plan de tratamiento se adapta a necesidades y metas individuales' },
  },
  {
    title: { en: 'Evidence-Based Practice', es: 'Práctica Basada en Evidencia' },
    desc: { en: 'Our protocols follow the latest clinical research guidelines', es: 'Nuestros protocolos siguen las últimas guías de investigación clínica' },
  },
  {
    title: { en: 'Collaborative Approach', es: 'Enfoque Colaborativo' },
    desc: { en: 'Multidisciplinary team working together for optimal outcomes', es: 'Equipo multidisciplinario trabajando juntos para resultados óptimos' },
  },
  {
    title: { en: 'Continuous Learning', es: 'Aprendizaje Continuo' },
    desc: { en: 'Regular training and certification in advancing techniques', es: 'Capacitación y certificación regular en técnicas avanzadas' },
  },
];

export default function Team() {
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
                {language === 'en' ? 'Expert Care Team' : 'Equipo de Atención Experto'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('team.title')}
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              {t('team.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {specialties.map((specialty) => (
              <div
                key={specialty.key}
                className="group bg-gray-50 hover:bg-white rounded-2xl p-8 transition-all duration-300 hover:shadow-xl"
              >
                <div className="flex items-start space-x-6">
                  <div className={`w-16 h-16 ${specialty.color} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <specialty.icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-navy-900 mb-3">
                      {t(`team.${specialty.key}`)}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {specialty.description[language]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              {language === 'en' ? 'Our Approach' : 'Nuestro Enfoque'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {language === 'en'
                ? 'We combine expertise, compassion, and cutting-edge technology to deliver the best possible care.'
                : 'Combinamos experiencia, compasión y tecnología de vanguardia para brindar la mejor atención posible.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-bold text-navy-900 mb-2">{value.title[language]}</h3>
                <p className="text-gray-600 text-sm">{value.desc[language]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                {language === 'en' ? 'Our Commitment to Excellence' : 'Nuestro Compromiso con la Excelencia'}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                {language === 'en'
                  ? 'Every member of our clinical team is dedicated to providing compassionate, evidence-based care. We stay at the forefront of neuromodulation research to ensure our patients receive the most effective treatments available.'
                  : 'Cada miembro de nuestro equipo clínico está dedicado a brindar atención compasiva y basada en evidencia. Permanecemos en la vanguardia de la investigación en neuromodulación para asegurar que nuestros pacientes reciban los tratamientos más efectivos disponibles.'}
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-gray-700">
                    {language === 'en'
                      ? 'Board-certified specialists in psychiatry and neurology'
                      : 'Especialistas certificados en psiquiatría y neurología'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-gray-700">
                    {language === 'en'
                      ? 'Extensive training in TMS and neuromodulation techniques'
                      : 'Capacitación extensa en técnicas de EMT y neuromodulación'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-gray-700">
                    {language === 'en'
                      ? 'Ongoing continuing education and research participation'
                      : 'Educación continua y participación en investigación'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-gray-700">
                    {language === 'en'
                      ? 'Patient-focused approach with individualized treatment plans'
                      : 'Enfoque centrado en el paciente con planes de tratamiento individualizados'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-navy-50 to-gray-100 rounded-3xl p-8 lg:p-12">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-navy-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-navy-900 mb-2">
                  {language === 'en' ? 'Multidisciplinary Team' : 'Equipo Multidisciplinario'}
                </h3>
                <p className="text-gray-600">
                  {language === 'en'
                    ? 'Working together for your success'
                    : 'Trabajando juntos por su éxito'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-navy-600" />
                    </div>
                    <span className="font-medium text-navy-900">{t('team.psychiatry')}</span>
                  </div>
                  <div className="text-teal-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Heart className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="font-medium text-navy-900">{t('team.psychology')}</span>
                  </div>
                  <div className="text-teal-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Brain className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="font-medium text-navy-900">{t('team.neuropsychology')}</span>
                  </div>
                  <div className="text-teal-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="font-medium text-navy-900">{t('team.neuromodulation')}</span>
                  </div>
                  <div className="text-teal-600">
                    <Award className="w-5 h-5" />
                  </div>
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
            {language === 'en' ? 'Meet Our Team' : 'Conozca a Nuestro Equipo'}
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            {language === 'en'
              ? 'Schedule a consultation to discuss your treatment options with our specialists.'
              : 'Programe una consulta para discutir sus opciones de tratamiento con nuestros especialistas.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a
              href="https://wa.me/522311442941?text=Hello,%20I%20would%20like%20to%20schedule%20a%20TMS%20consultation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold transition-all duration-300"
            >
              <MessageCircle className="w-5 h-5" />
              <span>WhatsApp</span>
            </a>
            <a
              href="tel:+522311442941"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all duration-300 border border-white/20"
            >
              <Phone className="w-5 h-5" />
              <span>+52 231 144 2941</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
