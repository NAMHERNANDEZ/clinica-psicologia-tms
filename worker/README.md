# Clínica TMS - Cloudflare Worker API

Backend completo para sistema clínico de psicología y TMS.

## Stack

- Cloudflare Workers
- Cloudflare D1 (SQLite)
- JWT + HttpOnly Cookies
- RBAC (Admin, Therapist, Patient)
- Rate Limiting
- Audit Logging
- Cron Triggers

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev

# Ejecutar tests
npm test

# Inicializar base de datos
npm run db:init

# Cargar datos de prueba
npm run db:seed
```

## Despliegue

```bash
# Configurar secretos
npx wrangler secret put JWT_SECRET
npx wrangler secret put REFRESH_SECRET

# Desplegar
npm run deploy
```

## API Endpoints

### Auth (Público)
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar paciente
- `POST /api/auth/refresh` - Refrescar token
- `POST /api/auth/logout` - Cerrar sesión

### Protegidos (Requieren autenticación)
- `GET /api/me` - Obtener usuario actual
- `GET /api/dashboard` - Estadísticas (Admin)
- `GET /api/reminders` - Recordatorios

### Pacientes
- `GET /api/patients` - Listar pacientes
- `POST /api/patients` - Crear paciente (Admin)
- `GET /api/patients/:id` - Obtener paciente
- `PUT /api/patients/:id` - Actualizar paciente (Admin)
- `DELETE /api/patients/:id` - Eliminar paciente (Admin)

### Terapeutas
- `GET /api/therapists` - Listar terapeutas
- `POST /api/therapists` - Crear terapeuta (Admin)
- `GET /api/therapists/:id` - Obtener terapeuta
- `PUT /api/therapists/:id` - Actualizar terapeuta (Admin)
- `DELETE /api/therapists/:id` - Desactivar terapeuta (Admin)

### Citas
- `GET /api/appointments` - Listar citas
- `POST /api/appointments` - Crear cita (Admin/Therapist)
- `GET /api/appointments/:id` - Obtener cita
- `PUT /api/appointments/:id` - Actualizar cita (Admin/Therapist)
- `DELETE /api/appointments/:id` - Eliminar cita (Admin)

## Roles y Permisos

### Admin
- Acceso completo a todas las funciones
- Gestión de pacientes, terapeutas y citas
- Dashboard y auditoría

### Therapist
- Ver sus pacientes asignados
- Gestionar sus citas
- Registrar notas clínicas

### Patient
- Ver sus próximas citas
- Actualizar sus datos básicos

## Seguridad

- JWT con expiración de 15 minutos (access) / 30 días (refresh)
- Passwords hasheados con PBKDF2-SHA512 (100,000 iteraciones)
- HttpOnly cookies para tokens
- Rate limiting: 100 requests por IP cada 15 minutos
- CORS restrictivo
- Auditoría de todas las acciones

## Base de Datos

```bash
# Inicializar schema
npm run db:init

# Cargar datos de prueba
npm run db:seed
```

### Usuarios de Prueba
- Admin: admin@neurocienciaclinica.mx
- Terapeuta: maria.garcia@neurocienciaclinica.mx
