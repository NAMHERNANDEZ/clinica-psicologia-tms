# Politica de Seguridad de la Informacion - ISO 27001
## Clinica de Psicologia y Terapia Magnetica Transcraneal

### 1. Alcance
Esta politica aplica a todo el personal, sistemas y procesos de la clinica que manejan datos de pacientes y registros clinicos.

### 2. Controles de Seguridad Implementados

#### 2.1 Controles de Acceso
- **Autenticacion**: JWT con tokens de acceso (15 min) y refresh (30 dias)
- **Contrasenas**: Hash PBKDF2-SHA512 con salt aleatorio
- **RBAC**: 4 roles (admin, therapist, reception, patient) con permisos granulares
- **Rate Limiting**: 5 intentos/15min por IP+email en login

#### 2.2 Proteccion de Datos
- **Cifrado en transito**: TLS 1.3 (Cloudflare)
- **Cifrado en reposo**: D1 Database (Cloudflare managed)
- **Cookies**: HttpOnly + Secure + SameSite=Strict
- **CORS**: Dominios permitidos configurados explicitamente

#### 2.3 Registro y Auditoria
- **Audit Logs**: cada operacion critica registra who/what/when/before/after
- **Security Incidents**: registro automatico de intentos de acceso no autorizado
- **User Agent tracking**: para investigacion de incidentes

#### 2.4 Seguridad de la Aplicacion
- **CSP**: default-src 'none'; frame-ancestors 'none'
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **HSTS**: max-age=31536000; includeSubDomains
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: camera=(), microphone=(), geolocation=()

### 3. Gestion de Incidentes
- Intentos de login fallidos > 5 → security_incident automatico
- Datos sensibles en logs → revisión y eliminación periódica
- Vulnerabilidades → reporte a autoridad de seguridad

### 4. Continuidad del Negocio
- D1 Database con replicación automática
- Cloudflare Workers con disponibilidad 99.9%
- Backups automaticos de base de datos

### 5. Cumplimiento Normativo
- NOM-004-SSA3-2012: Del expediente clinico
- NOM-020-SSA1-2011: Para la práctica de la psicología
- Ley General de Protección de Datos Personales (LGPDPPSO)

---
**Ultima revision**: 2026-07-24
**Responsable**: Administrador del Sistema
