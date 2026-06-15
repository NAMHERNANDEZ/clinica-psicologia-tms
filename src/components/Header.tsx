import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Globe, Brain, Phone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navItems = [
    { path: '/', label: t('nav.home') },
    { path: '/nosotros', label: t('nav.about') },
    { path: '/servicios', label: t('nav.services') },
    { path: '/emt-tms', label: t('nav.tms') },
    { path: '/proceso', label: t('nav.experience') },
    { path: '/testimonios', label: t('nav.testimonials') },
    { path: '/blog', label: t('nav.blog') },
    { path: '/faq', label: t('nav.faq') },
    { path: '/contacto', label: t('nav.contact') },
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
              isScrolled
                ? 'bg-navy-900'
                : 'bg-white/10 backdrop-blur-sm'
            }`}>
              <Brain className={`w-7 h-7 transition-colors duration-300 ${
                isScrolled ? 'text-teal-400' : 'text-white'
              }`} />
            </div>
            <div className="flex flex-col">
              <span className={`text-lg font-bold tracking-tight transition-colors duration-300 ${
                isScrolled ? 'text-navy-900' : 'text-white'
              }`}>
                {language === 'es' ? 'Neurociencia Clínica' : 'Clinical Neuroscience'}
              </span>
              <span className={`text-xs font-medium tracking-wide transition-colors duration-300 ${
                isScrolled ? 'text-slate-500' : 'text-white/70'
              }`}>
                {language === 'es' ? 'Psicología • EMT/TMS' : 'Psychology • TMS'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center space-x-1">
            {navItems.slice(0, 6).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  location.pathname === item.path
                    ? isScrolled
                      ? 'bg-navy-100 text-navy-900'
                      : 'bg-white/10 text-white'
                    : isScrolled
                      ? 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="hidden xl:flex items-center space-x-3">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                isScrolled
                  ? 'text-navy-700 hover:bg-slate-50'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{language === 'es' ? 'ES' : 'EN'}</span>
            </button>

            {/* CTA Button */}
            <a
              href="https://wa.me/522311442941?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20consulta."
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                isScrolled
                  ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-md hover:shadow-lg hover:shadow-teal-500/25'
                  : 'bg-white text-navy-900 hover:bg-slate-50'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>{t('hero.cta')}</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`xl:hidden p-2 rounded-lg transition-colors duration-200 ${
              isScrolled
                ? 'text-navy-900 hover:bg-slate-100'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`xl:hidden overflow-hidden transition-all duration-300 ${
            isOpen ? 'max-h-screen mt-4' : 'max-h-0'
          }`}
        >
          <nav className="bg-white rounded-2xl shadow-xl p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors duration-200 ${
                  location.pathname === item.path
                    ? 'bg-navy-100 text-navy-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between">
              <button
                onClick={toggleLanguage}
                className="flex items-center space-x-2 px-4 py-2.5 text-navy-700 font-medium rounded-xl hover:bg-slate-50"
              >
                <Globe className="w-5 h-5" />
                <span>{language === 'es' ? 'English' : 'Español'}</span>
              </button>
              <a
                href="https://wa.me/522311442941?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20consulta."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{t('hero.cta')}</span>
              </a>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
