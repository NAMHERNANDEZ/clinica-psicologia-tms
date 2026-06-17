import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function WhatsAppButton() {
  const { language } = useLanguage();

  return (
    <a
      href="https://wa.me/522311442941?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20consulta."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-green-500 hover:bg-green-400 text-white px-5 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:shadow-green-500/25 transition-all duration-300 group"
      aria-label={language === 'es' ? 'Contactar por WhatsApp' : 'Contact via WhatsApp'}
    >
      <MessageCircle className="w-6 h-6" />
      <span className="font-semibold hidden sm:inline">WhatsApp</span>
    </a>
  );
}
