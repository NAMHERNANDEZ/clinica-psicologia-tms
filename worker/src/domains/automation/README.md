# Automation Domain

El motor de automatización conecta eventos del sistema con notificaciones programadas.

## Flujo

Evento de origen (lead, cita, recordatorio)  →  Service de automatización  →  Executor  →  Log de notificación

## Eventos soportados

- LEAD_CREATED
- APPOINTMENT_CREATED
- APPOINTMENT_CONFIRMED
- REMINDER_24H
- REMINDER_1H
- APPOINTMENT_COMPLETED

## Templates

Cada evento tiene un mensaje predefinido por canal (WhatsApp/Email).

## Uso

POST /api/automation/events

Body:
{
  "event_type": "APPOINTMENT_CREATED",
  "data": { ... }
}

Devuelve:
{
  "success": true,
  "data": {
    "notification_id": 123
  }
}
