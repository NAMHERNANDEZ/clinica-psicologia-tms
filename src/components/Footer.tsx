import { Link } from 'react-router-dom';
import { Brain, Phone, MessageCircle, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { language, t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-900 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-3 mb-5">
              <div className="p-2.5 bg-navy-800 rounded-xl">
                <Brain className="w-7 h-7 text-teal-400" />
              </div>
              <div>
                <span className="text-lg font-bold">
                  {language === 'es' ? 'Neurociencia Clínica' : 'Clinical Neuroscience'}
                </span>
                <p className="text-xs text-slate-400">
                  {language === 'es' ? 'Psicología • EMT/TMS' : 'Psychology • TMS'}
                </p>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {language === 'es'
                ? 'Atención psicológica especializada que integra neurociencia y psicoterapia basada en evidencia.'
                : 'Specialized psychological care integrating neuroscience and evidence-based psychotherapy.'}
            </p>
            <div className="flex space-x-3">
              <a
                href="https://wa.me/522311442941?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20consulta."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl transition-colors duration-200 font-medium text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
              <a
                href="tel:+522311442941"
                className="flex items-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 rounded-xl transition-colors duration-200 font-medium text-sm"
              >
                <Phone className="w-4 h-4" />
                <span>{language === 'es' ? 'Llamar' : 'Call'}</span>
              </a>
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
              {language === 'es' ? 'Navegación' : 'Navigation'}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/nosotros" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/servicios" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                  {t('nav.services')}
                </Link>
              </li>
              <li>
                <Link to="/emt-tms" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                  {t('nav.tms')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
              {language === 'es' ? 'Recursos' : 'Resources'}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/proceso" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                  {t('nav.experience')}
                </Link>
              </li>
              <li>
                <Link to="/testimonios" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                  {t('nav.testimonials')}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                  {t('nav.blog')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                  {t('nav.faq')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
              {t('contact.hours')}
            </h3>
            <ul className="space-y-3 text-slate-400">
              <li className="text-sm">{t('contact.hoursWeekday')}</li>
              <li className="text-sm">{t('contact.hoursSaturday')}</li>
              <li className="pt-3 mt-3 border-t border-navy-800">
                <a href="tel:+522311442941" className="text-teal-400 hover:text-teal-300 font-medium transition-colors duration-200">
                  +52 231 144 2941
                </a>
              </li>
              <li className="flex items-start space-x-2 text-sm text-slate-500">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{language === 'es' ? '5 de Febrero esq. Benito Juárez, Centro' : '5 de Febrero cor. Benito Juárez, Centro'}</span>
              </li>
              <li className="text-sm text-slate-500">
                {language === 'es' ? 'Xalapa, Veracruz-Puebla' : 'Xalapa, Veracruz-Puebla'}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-navy-950 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500 leading-relaxed text-center">
            {t('footer.disclaimer')}
          </p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-navy-950 border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p className="text-sm text-slate-500">
              &copy; {currentYear} {language === 'es' ? 'Neurociencia Clínica' : 'Clinical Neuroscience'}. {t('footer.rights')}
            </p>
            <div className="flex items-center space-x-6">
              <Link to="/privacidad" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                {t('footer.privacy')}
              </Link>
              <Link to="/terminos" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                {t('footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
