import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Quote, ArrowRight, Shield } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const testimonials = [
  {
    id: 1,
    quote: { es: 'Después de años luchando con la ansiedad, finalmente encontré un enfoque que realmente funcionó. La combinación de terapia y el tratamiento me devolvió la calidad de vida que había perdido.', en: 'After years of struggling with anxiety, I finally found an approach that really worked. The combination of therapy and treatment gave me back the quality of life I had lost.' },
    condition: { es: 'Trastorno de Ansiedad Generalizada', en: 'Generalized Anxiety Disorder' },
  },
  {
    id: 2,
    quote: { es: 'El equipo me hizo sentir comprendida desde la primera consulta. La depresión resistant al tratamiento me había robado años, pero EMT/TMS cambió todo para mí.', en: 'The team made me feel understood from the first consultation. Treatment-resistant depression had stolen years from me, but TMS changed everything for me.' },
    condition: { es: 'Depresión Resistente al Tratamiento', en: 'Treatment-Resistant Depression' },
  },
  {
    id: 3,
    quote: { es: 'Profesionales excepcionales que realmente escuchan. El enfoque integral abordó tanto mi trauma como las herramientas que necesitaba para seguir adelante.', en: 'Exceptional professionals who really listen. The comprehensive approach addressed both my trauma and the tools I needed to move forward.' },
    condition: { es: 'Trauma y TEPT', en: 'Trauma and PTSD' },
  },
  {
    id: 4,
    quote: { es: 'La regulación emocional siempre fue mi mayor desafío. Gracias al tratamiento especializado, ahora tengo herramientas reales para manejar mis emociones intensas.', en: 'Emotional regulation was always my biggest challenge. Thanks to specialized treatment, I now have real tools to manage my intense emotions.' },
    condition: { es: 'Regulación Emocional', en: 'Emotional Regulation' },
  },
  {
    id: 5,
    quote: { es: 'Probé muchos tratamientos antes sin éxito. La EMT combinada con terapia fue la respuesta que buscaba durante años.', en: 'I tried many treatments before without success. TMS combined with therapy was the answer I had been seeking for years.' },
    condition: { es: 'TOC', en: 'OCD' },
  },
  {
    id: 6,
    quote: { es: 'La evaluación clínica integral marcó la diferencia. Por primera vez sentí que entendían completamente mi situación antes de proponer un tratamiento.', en: 'The comprehensive clinical evaluation made the difference. For the first time I felt they fully understood my situation before proposing treatment.' },
    condition: { es: 'TDAH Adulto', en: 'Adult ADHD' },
  },
];

export default function Testimonials() {
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
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <Quote className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Historias de Transformación' : 'Transformation Stories'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('testimonials.title')}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              {t('testimonials.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-amber-50 border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{t('testimonials.disclaimer')}</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Quote className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="w-10 h-10 bg-navy-100 rounded-full" />
                </div>
                <p className="text-slate-700 leading-relaxed mb-4 text-sm">
                  "{testimonial.quote[language]}"
                </p>
                <div className="pt-4 border-t border-slate-100">
                  <span className="text-xs font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
                    {testimonial.condition[language]}
                  </span>
                </div>
              </div>
            ))}
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
            {language === 'es' ? 'Escribe tu Propia Historia de Transformación' : 'Write Your Own Transformation Story'}
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            {language === 'es'
              ? 'Cada camino hacia el bienestar es único. El tuyo puede comenzar hoy.'
              : 'Every path to wellness is unique. Yours can begin today.'}
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
