export interface MessageTemplate {
  event_type: string;
  channel: 'WHATSAPP' | 'EMAIL';
  subject: string;
  body: string;
}

export const TEMPLATES: MessageTemplate[] = [
  {
    event_type: 'LEAD_CREATED',
    channel: 'WHATSAPP',
    subject: '¡Nuevo Lead!',
    body: 'Hola {{nombre}}, recibimos tu solicitud de información. Un especialista se pondrá en contacto contigo pronto.'
  },
  {
    event_type: 'APPOINTMENT_CREATED',
    channel: 'WHATSAPP',
    subject: 'Cita Confirmada',
    body: 'Hola {{nombre}}, tu cita ha sido registrada:\n\nFecha: {{fecha}}\nHora: {{hora}}\nServicio: {{servicio}}'
  },
  {
    event_type: 'APPOINTMENT_CONFIRMED',
    channel: 'WHATSAPP',
    subject: 'Recordatorio de Cita',
    body: 'Recordatorio: Tu cita es mañana a las {{hora}} para {{servicio}}. Por favor llega 10 minutos antes.'
  },
  {
    event_type: 'REMINDER_24H',
    channel: 'WHATSAPP',
    subject: 'Recordatorio de Consulta',
    body: '{{nombre}}, te recordamos tu consulta mañana a las {{hora}} para {{servicio}}.'
  },
  {
    event_type: 'REMINDER_1H',
    channel: 'WHATSAPP',
    subject: 'Recordatorio - Una Hora',
    body: '{{nombre}}, tu consulta comienza en 1 hora (a las {{hora}}).'
  },
  {
    event_type: 'APPOINTMENT_COMPLETED',
    channel: 'WHATSAPP',
    subject: 'Consulta Completada',
    body: '{{nombre}}, tu consulta ha finalizado. Se ha generado un resumen con tus datos y próximos pasos.'
  }
];
