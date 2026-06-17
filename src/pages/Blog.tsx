import { useState, useEffect } from 'react';
import { Book, Brain, Heart, Activity, Clock, Shield, ArrowRight, MessageCircle, Calendar } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const categories = [
  { key: 'anxiety', icon: Activity, color: 'bg-blue-500' },
  { key: 'depression', icon: Heart, color: 'bg-indigo-500' },
  { key: 'neuroscience', icon: Brain, color: 'bg-purple-500' },
  { key: 'tms', icon: Shield, color: 'bg-teal-500' },
  { key: 'stress', icon: Clock, color: 'bg-amber-500' },
  { key: 'trauma', icon: Activity, color: 'bg-rose-500' },
];

const articles = [
  {
    id: 1,
    title: { es: 'La Neurociencia de la Ansiedad: Entendiendo tu Cerebro', en: 'The Neuroscience of Anxiety: Understanding Your Brain' },
    excerpt: { es: 'Descubre cómo las modernas técnicas de neuroimagen están revolucionando nuestra comprensión de los trastornos de ansiedad y abriendo nuevas puertas terapéuticas.', en: 'Discover how modern neuroimaging techniques are revolutionizing our understanding of anxiety disorders and opening new therapeutic doors.' },
    category: 'anxiety',
    date: '2024-01-15',
    readTime: '8 min',
  },
  {
    id: 2,
    title: { es: 'EMT/TMS: Una Nueva Esperanza para la Depresión Resistente', en: 'TMS: New Hope for Treatment-Resistant Depression' },
    excerpt: { es: 'La Estimulación Magnética Transcraneal ofrece una alternativa no farmacológica basada en evidencia para casos resistentes al tratamiento convencional.', en: 'Transcranial Magnetic Stimulation offers an evidence-based non-pharmacological alternative for cases resistant to conventional treatment.' },
    category: 'tms',
    date: '2024-02-01',
    readTime: '10 min',
  },
  {
    id: 3,
    title: { es: 'Neuroplasticidad: El Poder del Cerebro para Cambiar', en: 'Neuroplasticity: The Brain\'s Power to Change' },
    excerpt: { es: 'Cómo la experiencia la terapia y los tratamientos de neuromodulación pueden reconfigurar circuitos cerebrales y crear nuevos patrones de funcionamiento.', en: 'How experience therapy and neuromodulation treatments can reconfigure brain circuits and create new functioning patterns.' },
    category: 'neuroscience',
    date: '2024-02-15',
    readTime: '7 min',
  },
  {
    id: 4,
    title: { es: 'El Trauma y el Cerebro: Caminos hacia la Sanación', en: 'Trauma and the Brain: Paths to Healing' },
    excerpt: { es: 'Comprender cómo el trauma afecta el cerebro es el primer paso hacia la recuperación. Exploramos los enfoques terapéuticos más efectivos.', en: 'Understanding how trauma affects the brain is the first step toward recovery. We explore the most effective therapeutic approaches.' },
    category: 'trauma',
    date: '2024-03-01',
    readTime: '9 min',
  },
  {
    id: 5,
    title: { es: 'Burnout: Cuando el Estrés Sobrepasa tus Límites', en: 'Burnout: When Stress Exceeds Your Limits' },
    excerpt: { es: 'El síndrome de burnout va más allá del cansancio. Aprende a identificar las señales y las estrategias basadas en evidencia para recuperarte.', en: 'Burnout syndrome goes beyond tiredness. Learn to identify the signs and evidence-based strategies to recover.' },
    category: 'stress',
    date: '2024-03-15',
    readTime: '6 min',
  },
  {
    id: 6,
    title: { es: 'La Depresión no es Debilidad: Un Enfoque Científico', en: 'Depression is Not Weakness: A Scientific Approach' },
    excerpt: { es: 'La investigación moderna demuestra que la depresión tiene bases neurobiológicas. Entender esto es crucial para un tratamiento efectivo.', en: 'Modern research shows that depression has neurobiological bases. Understanding this is crucial for effective treatment.' },
    category: 'depression',
    date: '2024-04-01',
    readTime: '8 min',
  },
];

export default function Blog() {
  const { language, t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const filteredArticles = selectedCategory
    ? articles.filter(a => a.category === selectedCategory)
    : articles;

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Hero */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <Book className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Conocimiento Científico' : 'Scientific Knowledge'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('blog.title')}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              {t('blog.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 bg-white border-b border-slate-100 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedCategory ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {language === 'es' ? 'Todos' : 'All'}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat.key ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <cat.icon className="w-4 h-4" />
                <span>{t(`services.${cat.key}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article, index) => {
              const category = categories.find(c => c.key === article.category);
              return (
                <article
                  key={article.id}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className={`h-3 ${category?.color || 'bg-slate-400'}`} />
                  <div className="p-6">
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(article.date).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span className="text-slate-300">|</span>
                      <span>{article.readTime}</span>
                    </div>
                    <h3 className="text-lg font-bold text-navy-900 mb-3 leading-tight">
                      {article.title[language]}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      {article.excerpt[language]}
                    </p>
                    <button className="inline-flex items-center space-x-2 text-teal-600 hover:text-teal-700 font-medium text-sm group">
                      <span>{t('blog.readMore')}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">
            {language === 'es' ? '¿Preguntas sobre estos temas?' : 'Questions about these topics?'}
          </h2>
          <p className="text-slate-600 mb-6">
            {language === 'es'
              ? 'Nuestro equipo puede responder todas tus dudas y ayudarte a encontrar el tratamiento adecuado.'
              : 'Our team can answer all your questions and help you find the right treatment.'}
          </p>
          <a
            href="https://wa.me/522311442941?text=Hola,%20tengo%20una%20pregunta%20sobre%20los%20artículos%20del%20blog."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-3 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>WhatsApp</span>
          </a>
        </div>
      </section>
    </div>
  );
}
