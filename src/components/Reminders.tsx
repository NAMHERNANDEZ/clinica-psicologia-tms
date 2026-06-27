import { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { reminders as remindersApi, type Reminder } from '../lib/api';

export default function Reminders() {
  const { language } = useLanguage();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReminders();
    const interval = setInterval(loadReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    try {
      const res = await remindersApi.list();
      setReminders(res.data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || reminders.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case '1h':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case '24h':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-teal-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case '1h':
        return 'bg-red-50 border-red-200';
      case '24h':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-teal-50 border-teal-200';
    }
  };

  return (
    <div className="mb-6 space-y-3">
      {reminders.map((reminder, index) => (
        <div
          key={`${reminder.appointment_id}-${reminder.type}-${index}`}
          className={`rounded-xl p-4 border ${getBgColor(reminder.type)} shadow-sm`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(reminder.type)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-navy-900">
                {reminder.type === '1h'
                  ? language === 'es'
                    ? '¡Cita en 1 hora!'
                    : 'Appointment in 1 hour!'
                  : reminder.type === '24h'
                  ? language === 'es'
                    ? 'Cita mañana'
                    : 'Appointment tomorrow'
                  : language === 'es'
                  ? 'Cita hoy'
                  : 'Appointment today'}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {reminder.patient_name || `Paciente #${reminder.patient_id}`}
                {reminder.therapist_name ? ` — ${reminder.therapist_name}` : ''}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
