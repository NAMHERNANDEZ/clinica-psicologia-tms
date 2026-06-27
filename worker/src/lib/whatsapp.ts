export interface WhatsAppMessage {
  phone: string;
  message: string;
  url: string;
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function renderAppointmentReminder(
  patientName: string,
  date: string,
  time: string,
  therapistName: string
): string {
  return `Hola ${patientName},

Te recordamos tu cita:
📅 ${date}
🕒 ${time}
👨‍⚕️ ${therapistName}

Si necesitas cambiarla, contáctanos.`;
}

export function renderAppointmentConfirmation(
  patientName: string,
  date: string,
  time: string,
  therapistName: string
): string {
  return `${patientName}, tu cita ha sido confirmada:
📅 ${date}
🕒 ${time}
👨‍⚕️ ${therapistName}

Te esperamos.`;
}

export function renderCancellationNotice(
  patientName: string,
  date: string,
  time: string
): string {
  return `${patientName}, tu cita del ${date} a las ${time} ha sido cancelada. Si deseas reprogramar, contáctanos.`;
}
