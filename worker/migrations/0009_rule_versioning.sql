-- Migration 0009: Rule versioning
-- Agrega version, description, effective_from, effective_to a compliance_rules

ALTER TABLE compliance_rules ADD COLUMN version TEXT DEFAULT 'v1.0';
ALTER TABLE compliance_rules ADD COLUMN description TEXT;
ALTER TABLE compliance_rules ADD COLUMN effective_from TEXT;
ALTER TABLE compliance_rules ADD COLUMN effective_to TEXT;

-- Update existing rules with version and description
UPDATE compliance_rules SET
  version = 'v1.0',
  description = CASE code
    WHEN 'NOM-001' THEN 'Verifica que el consentimiento informado esté firmado y vigente'
    WHEN 'NOM-002' THEN 'Valida que el expediente clínico contenga todos los campos requeridos (motivo, evaluación, diagnóstico, plan)'
    WHEN 'NOM-003' THEN 'Verifica que exista al menos una nota SOAP completa por sesión'
    WHEN 'NOM-004' THEN 'Confirma que el diagnóstico esté registrado en el expediente'
    WHEN 'NOM-005' THEN 'Verifica que exista un plan terapéutico vigente'
    WHEN 'COFEPRIS-001' THEN 'Consentimiento específico para procedimientos TMS'
    WHEN 'COFEPRIS-002' THEN 'Verifica que el operador esté autorizado y registrado'
    WHEN 'COFEPRIS-003' THEN 'Confirma que el equipo TMS esté registrado con calibración vigente'
    WHEN 'COFEPRIS-004' THEN 'Verifica registro de eventos adversos'
    WHEN 'COFEPRIS-005' THEN 'Confirma seguimiento post-sesión documentado'
    WHEN 'ISO9001-001' THEN 'Métricas de calidad actualizadas en el período'
    WHEN 'ISO9001-002' THEN 'Encuesta de satisfacción aplicada al paciente'
    WHEN 'ISO9001-003' THEN 'Tiempo de respuesta dentro del límite establecido'
    WHEN 'ISO9001-004' THEN 'Tasa de no-asistencia dentro del margen permitido'
    WHEN 'ISO9001-005' THEN 'Proceso documentado y seguido según ISO 9001'
    WHEN 'ISO27001-001' THEN 'Registro de intento de login válido en auditoría'
    WHEN 'ISO27001-002' THEN 'Auditoría de accesos activa y sin anomalías'
    WHEN 'ISO27001-003' THEN 'Acceso concedido con rol válido y vigente'
    WHEN 'ISO27001-004' THEN 'Sesión no expirada con refresh token válido'
    WHEN 'ISO27001-005' THEN 'Backup verificado en las últimas 24 horas'
    ELSE description
  END,
  effective_from = created_at
WHERE version IS NULL;