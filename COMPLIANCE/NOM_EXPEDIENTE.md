# Cumplimiento NOM-004-SSA3-2012 - Expediente Clinico
## Clinica de Psicologia y Terapia Magnetica Transcraneal

### 1. Alcance
Este documento establece los lineamientos para el conteido, formato y manejo del expediente clinico de conformidad con la Norma Oficial Mexicana NOM-004-SSA3-2012.

### 2. Elementos del Expediente Clinico

#### 2.1 Datos de Identificacion
- Nombre completo del paciente
- Fecha de nacimiento
- Domicilio
- Numero de telefono
- Email (opcional)

#### 2.2 Historia Clinica
- Motivo de consulta
- Antecedentes personales patologicos
- Antecedentes familiares
- Revision por aparatos y sistemas
- Exploracion fisica (aplicable)
- Estudios complementarios

#### 2.3 Diagnostico
- Diagnostico principal (CIE-10)
- Diagnosticos secundarios
- Diagnostico diferencial

#### 2.4 Plan de Tratamiento
- Objetivos terapeuticos
- Intervenciones propuestas
- Numero estimado de sesiones
- Frecuencia de sesiones
- Criterios de alta

### 3. Notas de Evolucion (SOAP)

#### S - Subjetivo
Lo que el paciente refiere (sintomas, percepciones, sentimientos)

#### O - Objetivo
Observaciones del clinico (signos vitales, conducta, resultados de evaluacion)

#### A - Analisis
Impresion clinica, diagnostico diferencial, evolucion

#### P - Plan
Acciones a seguir, ajustes de tratamiento, proxima sesion

### 4. Consentimiento Informado
- Tipo de tratamiento
- Beneficios esperados
- Riesgos y efectos adversos
- Alternativas de tratamiento
- Derecho a retirar consentimiento
- Firma del paciente y terapeuta
- Fecha y hora

### 5. Digitalizacion del Expediente

#### 5.1 Tablas del Sistema
| Tabla | Contenido |
|-------|-----------|
| clinical_records | Expediente clinico integral |
| session_notes | Notas SOAP por sesion |
| consents | Consentimientos informados |
| clinical_notes | Notas clinicas adicionales |
| audit_logs | Registro de modificaciones |

#### 5.2 Integridad de Datos
- Hash SHA-256 en documentos criticos
- Registro de auditoria con before/after
- Timestamps automaticos
- Proteccion contra modificacion no autorizada

#### 5.3 Respaldo y Recuperacion
- D1 Database replicada automaticamente
- Backup diario automatizado
- Retencion minima: 5 anos
- Recuperacion en < 24 horas

### 6. Acceso al Expediente
- **Paciente**: Lectura de su propio expediente
- **Terapeuta**: Lectura/escritura de pacientes asignados
- **Admin**: Acceso completo
- **Reception**: Solo datos demograficos

### 7. Conservacion y Borrado
- Expedientes activos: acceso inmediato
- Expedientes inactivos: 5 anos de conservacion
- Borrado definitivo: solo por autorizacion judicial
- Registro de cualquier eliminacion en audit_logs

### 8. Auditoria
- Cada consulta al expediente se registra
- Modificaciones con before_data/after_data
- Reportes de acceso mensuales
- Revision trimestral de integridad

---
**Referencia**: NOM-004-SSA3-2012
**Ultima revision**: 2026-07-24
**Responsable**: Coordinator de Calidad
