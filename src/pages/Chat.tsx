import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Calendar, Phone, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { appointments } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function sendChatMessage(message: string): Promise<{ message: string; action?: string; appointment?: { patient_name: string; phone: string; date: string; time: string } }> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Chat error');
  return res.json();
}

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function Chat() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcomeMessage: Message = {
      id: 1,
      text: language === 'es'
        ? 'Hola, soy la asistente virtual de Neurociencia Clínica. Puedo ayudarte con:\n\n• Información sobre servicios\n• Horarios de atención\n• Ubicación\n• Agendar citas\n\n¿En qué puedo ayudarte?'
        : 'Hello, I am the virtual assistant of Clinical Neuroscience. I can help you with:\n\n• Service information\n• Office hours\n• Location\n• Schedule appointments\n\nHow can I help you?',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await sendChatMessage(inputValue);

      const aiMessage: Message = {
        id: messages.length + 2,
        text: response.message,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (response.action === 'create_appointment' && response.appointment) {
        try {
          await appointments.create({ patient_id: 0, therapist_id: 0, date: response.appointment.date, time: response.appointment.time, duration: 30, status: 'scheduled', patient_name: response.appointment.patient_name });
          const confirmMessage: Message = {
            id: messages.length + 3,
            text: language === 'es'
              ? '✅ Cita creada exitosamente. Recibirás un recordatorio antes de tu cita.'
              : '✅ Appointment created successfully. You will receive a reminder before your appointment.',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, confirmMessage]);
        } catch {
          const errorMessage: Message = {
            id: messages.length + 3,
            text: language === 'es'
              ? '❌ Error al crear la cita. Por favor, intenta de nuevo.'
              : '❌ Error creating appointment. Please try again.',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }
    } catch {
      const errorMessage: Message = {
        id: messages.length + 2,
        text: language === 'es'
          ? 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.'
          : 'Sorry, there was an error processing your message. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'es' ? 'es-MX' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Hero */}
      <section className="relative py-12 lg:py-16 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <Bot className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Asistente Virtual' : 'Virtual Assistant'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {language === 'es' ? 'Secretaria IA' : 'AI Secretary'}
            </h1>
            <p className="text-lg text-slate-300">
              {language === 'es'
                ? 'Asistente inteligente para agendar citas y resolver dudas'
                : 'Intelligent assistant for scheduling appointments and answering questions'}
            </p>
          </div>
        </div>
      </section>

      {/* Chat Container */}
      <section className="py-8 bg-slate-50 min-h-[calc(100vh-300px)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Chat Messages */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.isUser
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-100 text-navy-900'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {!message.isUser && (
                        <Bot className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                      )}
                      {message.isUser && (
                        <User className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.isUser ? 'text-teal-100' : 'text-slate-500'
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-5 h-5 text-teal-500" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-slate-200 p-4">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    language === 'es'
                      ? 'Escribe tu mensaje...'
                      : 'Type your message...'
                  }
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="px-4 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-300 text-white rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setInputValue(language === 'es' ? 'Quiero agendar una cita' : 'I want to schedule an appointment')}
              className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <Calendar className="w-5 h-5 text-teal-500" />
              <span className="text-sm font-medium text-navy-900">
                {language === 'es' ? 'Agendar Cita' : 'Schedule Appointment'}
              </span>
            </button>

            <button
              onClick={() => setInputValue(language === 'es' ? 'Cuáles son sus horarios' : 'What are your hours')}
              className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <Clock className="w-5 h-5 text-teal-500" />
              <span className="text-sm font-medium text-navy-900">
                {language === 'es' ? 'Horarios' : 'Hours'}
              </span>
            </button>

            <button
              onClick={() => setInputValue(language === 'es' ? 'Dónde están ubicados' : 'Where are you located')}
              className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <Phone className="w-5 h-5 text-teal-500" />
              <span className="text-sm font-medium text-navy-900">
                {language === 'es' ? 'Contacto' : 'Contact'}
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
