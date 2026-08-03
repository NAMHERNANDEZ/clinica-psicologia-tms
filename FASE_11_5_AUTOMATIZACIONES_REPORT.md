# FASE 11.5 — AUTOMATIZACIONES (Completado)

## Objetivo

Crear un motor que responda a eventos:

```
EVENTO
   ↓
REGLA
   ↓
ACCIÓN
   ↓
REGISTRO
```

Ejemplo:

```
Nueva cita creada
        ↓
Enviar confirmación
        ↓
WhatsApp / Email
        ↓
Guardar historial
```

## Estado Actual

**✅ FASE 11.5 AUTOMATIZACIONES COMPLETADA**

El motor de automatización está completo con:

- **Eventos**: 6 tipos (LEAD_CREATED, APPOINTMENT_CREATED, APPOINTMENT_CONFIRMED, REMINDER_24H, REMINDER_1H, APPOINTMENT_COMPLETED)
- **Reglas**: Conectan eventos a acciones
- **Acciones**: Plantillas de mensajes predefinidas
- **Notificaciones**: Logging en `notification_logs` (YA EXISTÍA)
- **Integración**: Las citas generan recordatorios automáticamente
- **Tests**: Smoke test verificado

## Archivos Implementados

### automation/
- `events.ts` — Definiciones de tipos de eventos
- `service.ts` — Motor de automatización (nuevo)
- `executor.ts` — Ejecutor de eventos (nuevo)
- `templates.ts` — Plantillas de mensajes (nuevo)
- `routes.ts` — API endpoint (nuevo)
- `README.md` — Documentación (nuevo)

### Integración existente
- **reminders/service.ts** — Dispara automatización para recordatorios 24h/1h
- **appointments/service.ts** — Ya promueve leads→pacientes (FASE 11.4)

## Flujo

1. **Lead creado** → Automación → NOTIFICACIÓN
2. **Cita creada** → Automación → NOTIFICACIÓN
3. **Recordatorio 24h** → Automación → NOTIFICACIÓN
4. **Recordatorio 1h** → Automación → NOTIFICACIÓN
5. **Cita completada** → Automación → NOTIFICACIÓN

## Procesamiento de Eventos

**API**: `POST /api/automation/events`

```json
{
  "event_type": "APPOINTMENT_CREATED",
  "data": { ... }
}
```

**Respuesta**:

```json
{
  "success": true,
  "data": {
    "notification_id": 123
  }
}
```

## Templates por Evento

| Evento             | Canal    | Asunto                     | Cuerpo (ejemplo)                                     |
| ------------------ | -------- | ------------------------- | --------------------------------------------------- |
| **LEAD_CREATED**   | WhatsApp | ¡Nuevo Lead!              | Hola {{nombre}}, recibimos tu solicitud...         |
| **APPOINTMENT_CREATED** | WhatsApp | Cita Confirmada       | Hola {{nombre}}, tu cita ha sido registrada...     |
| **APPOINTMENT_CONFIRMED** | WhatsApp | Recordatorio de Cita | Recordatorio: Tu cita es mañana...              |
| **REMINDER_24H**   | WhatsApp | Recordatorio de Consulta | {{nombre}}, te recordamos tu consulta mañana...   |
| **REMINDER_1H**    | WhatsApp | Recordatorio - Una Hora  | {{nombre}}, tu consulta comienza en 1 hora...      |
| **APPOINTMENT_COMPLETED** | WhatsApp | Consulta Completada | {{nombre}}, tu consulta ha finalizado...          |

## Conexión con Sistemas Existentes

### 1. Lead → Cita (FASE 11.4)
- `appointments.create()` ya acepta `lead_id` y promueve a paciente
- **Resultado**: `LEAD_CREATED` → `APPOINTMENT_CREATED` automáticamente

### 2. Recordatorios (FASE 2 - ya existente)
- `generateReminders()` crea recordatorios automáticos 24h/1h
- **Nuevo**: Dispara `automation.event` para cada recordatorio
- **Resultado**: `REMINDER_24H` → `REMINDER_1H` automáticamente

### 3. Confirmación de cita
- `appointments.update()` cambia estado a `confirmed`
- **Nuevo**: Trigger `APPOINTMENT_CONFIRMED` automáticamente

## Testing

**Smoke Test**: `worker/scripts/smoke-test-automation.js`
- ✅ Login admin
- ✅ Crear lead de prueba
- ✅ Crear cita desde lead (evento ejecutado)
- ✅ Listar notificaciones
- ✅ Generar recordatorios (eventos ejecutados)
- ✅ Ejecutar evento de automatización manualmente

## Resultado

La clínica ahora tiene:

```
LEAD → CRM → PACIENTE
   ↓
AGENDA (Cita creada)
   ↓
AUTOMATIZACIONES
   ↓
RECORDATORIOS (24h/1h)
   ↓
NOTIFICACIONES (WhatsApp)
```

## Próximo Paso

**FASE 11.6 — Dashboard**

Con los datos reales disponibles ahora:

- Leads diarios
- Citas creadas
- Conversión lead→paciente
- Mensajes enviados por automatización
- Recordatorios ejecutados
- No shows

```
✅ 11.3 CRM
✅ 11.4 Agenda
✅ 11.5 Automatizaciones
⏳ 11.6 Dashboard (conecta con automatizaciones)
```

## Ventajas

1. **Reutiliza infraestructura existente**: notification_logs, reminders_queue
2. **Elimina trabajo duplicado**: Ya no necesita recrear logging
3. **Escalable**: Plantillas centralizadas, fácil de mantener
4. **Evento-driven**: Responde automáticamente a acciones clave
5. **Listo para producción**: Probado y documentado

**FASE 11.5 completa**: La clínica tiene automatizaciones semiautomáticas que conectan Lead→CRM→Agenda→Notificaciones.
