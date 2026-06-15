import { useState, useEffect } from 'react';
import { MessageCircle, Phone, Clock, MapPin, Send, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Contact() {
  const { language, t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });

    setTimeout(() => setIsSubmitted(false), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const subjectOptions = [
    { value: '', label: language === 'es' ? 'Selecciona un tema' : 'Select a topic' },
    { value: 'anxiety', label: t('services.anxiety') },
    { value: 'depression', label: t('services.depression') },
    { value: 'trauma', label: t('services.trauma') },
    { value: 'tms', label: 'EMT/TMS' },
    { value: 'evaluation', label: t('services.evaluation') },
    { value: 'online', label: t('services.online') },
    { value: 'other', label: language === 'es' ? 'Otro' : 'Other' },
  ];

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
              <MessageCircle className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Estamos Aquí para Ti' : 'We Are Here for You'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('contact.title')}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              {t('contact.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href="https://wa.me/522311442941?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20consulta."
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center space-x-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">{t('contact.whatsapp')}</h3>
                <p className="text-slate-600 text-sm">+52 231 144 2941</p>
              </div>
            </a>

            <a
              href="tel:+522311442941"
              className="group flex items-center space-x-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="w-14 h-14 bg-teal-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">{t('contact.phone')}</h3>
                <p className="text-slate-600 text-sm">+52 231 144 2941</p>
              </div>
            </a>

            <div className="flex items-center space-x-4 p-6 bg-white rounded-2xl shadow-sm">
              <div className="w-14 h-14 bg-navy-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-7 h-7 text-navy-600" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">{t('contact.location')}</h3>
                <p className="text-slate-600 text-sm">{language === 'es' ? '5 de Febrero esq. Benito Juárez, Centro' : '5 de Febrero cor. Benito Juárez, Centro'}</p>
                <p className="text-slate-500 text-xs">{language === 'es' ? 'Xalapa, Veracruz-Puebla' : 'Xalapa, Veracruz-Puebla'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form & Hours */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-navy-900 mb-6">
                {language === 'es' ? 'Envíanos un Mensaje' : 'Send us a Message'}
              </h2>

              {isSubmitted ? (
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-navy-900 mb-2">
                    {t('contact.form.success')}
                  </h3>
                  <p className="text-slate-600">
                    {language === 'es'
                      ? 'Te contactaremos a la brevedad.'
                      : 'We will contact you shortly.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-navy-900 mb-2">
                      {t('contact.form.name')} *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      placeholder={language === 'es' ? 'Tu nombre completo' : 'Your full name'}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-navy-900 mb-2">
                        {t('contact.form.email')} *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-navy-900 mb-2">
                        {t('contact.form.phone')}
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                        placeholder="+52 ..."
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-navy-900 mb-2">
                      {t('contact.form.subject')} *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white"
                    >
                      {subjectOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-navy-900 mb-2">
                      {t('contact.form.message')} *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
                      placeholder={language === 'es' ? '¿En qué podemos ayudarte?' : 'How can we help you?'}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-300 text-white rounded-xl font-semibold transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('contact.form.sending')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>{t('contact.form.submit')}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Hours & Info */}
            <div>
              <div className="bg-slate-50 rounded-2xl p-8 mb-6">
                <h3 className="text-xl font-bold text-navy-900 mb-6">
                  {t('contact.hours')}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-200">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-navy-600" />
                      <span className="font-medium text-navy-900">
                        {language === 'es' ? 'Lunes - Viernes' : 'Monday - Friday'}
                      </span>
                    </div>
                    <span className="text-slate-600">9:00 AM - 7:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-200">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-teal-600" />
                      <span className="font-medium text-navy-900">
                        {language === 'es' ? 'Sábado' : 'Saturday'}
                      </span>
                    </div>
                    <span className="text-slate-600">9:00 AM - 3:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <span className="font-medium text-navy-900">
                        {language === 'es' ? 'Domingo' : 'Sunday'}
                      </span>
                    </div>
                    <span className="text-slate-400">
                      {language === 'es' ? 'Cerrado' : 'Closed'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  {language === 'es'
                    ? 'Horario del Centro de México (Ciudad de México)'
                    : 'Central Mexico Time (Mexico City)'}
                </p>
              </div>

              <div className="bg-navy-900 rounded-2xl p-8 text-center">
                <MessageCircle className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  {language === 'es' ? 'Respuesta Rápida' : 'Quick Response'}
                </h3>
                <p className="text-slate-300 text-sm mb-6">
                  {language === 'es'
                    ? 'Para atención inmediata, contáctanos por WhatsApp.'
                    : 'For immediate attention, contact us via WhatsApp.'}
                </p>
                <a
                  href="https://wa.me/522311442941?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20consulta."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
