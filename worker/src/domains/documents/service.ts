import type { Env, DocumentType } from "../../types";
import { DocumentRepository, type DocumentInput } from "./repository";
import { logAudit } from "../../lib/audit";
import { batchExecute } from "../../lib/transaction";

interface UploadResult {
  key: string;
  type: string;
  size: number;
  name?: string;
}

export class DocumentService {
  private repo: DocumentRepository;

  constructor(private env: Env) {
    this.repo = new DocumentRepository(env);
  }

  async listPatientDocuments(clinicId: number, patientId: number) {
    const docs = await this.repo.findByPatient(patientId, clinicId);
    return { success: true, data: { documents: docs } };
  }

  async getDocument(clinicId: number, id: number) {
    const doc = await this.repo.findById(id, clinicId);
    if (!doc) return { success: false, error: "Documento no encontrado", status: 404 };
    return { success: true, data: { document: doc } };
  }

  /**
   * Devuelve el contenido del archivo desde R2 listo para descargar.
   * Si el documento no existe, no tiene storage_key o el objeto R2 no existe, devuelve un error.
   */
  async downloadDocument(clinicId: number, id: number) {
    const doc = await this.repo.findById(id, clinicId);
    if (!doc) return { success: false, error: "Documento no encontrado", status: 404 };
    if (!doc.storage_key) return { success: false, error: "Documento sin archivo almacenado", status: 404 };
    const bucket = this.env.CLINIC_DOCUMENTS_BUCKET;
    if (!bucket) return { success: false, error: "Almacenamiento de documentos no configurado", status: 500 };
    const object = await bucket.get(doc.storage_key);
    if (!object) return { success: false, error: "Archivo no encontrado en el almacenamiento", status: 404 };
    const originalName = object.customMetadata?.original_name || `documento-${id}`;
    return {
      success: true,
      data: {
        body: object.body,
        contentType: object.httpMetadata?.contentType || "application/octet-stream",
        fileName: originalName,
        size: object.size,
      },
    };
  }

  async createDocument(clinicId: number, data: DocumentInput, userId: number, ip: string) {
    // Validate required fields
    if (!data.document_type) return { success: false, error: "document_type requerido", status: 400 };
    if (!data.patient_id) return { success: false, error: "patient_id requerido", status: 400 };

    // Validate patient exists in the clinic scope
    const patient = await this.env.DB
      .prepare("SELECT id FROM patients WHERE id = ? AND clinic_id = ?")
      .bind(data.patient_id, clinicId)
      .first();
    if (!patient) return { success: false, error: "Paciente no encontrado", status: 404 };

    // Handle file upload if provided (validates type, size, viruses)
    let storage_key: string | undefined;
    let fileMeta: { mime_type?: string; file_size?: number } = {};
    if (data.file && data.file.content) {
      try {
        const uploaded = await this.handleFileUpload(data, clinicId, userId, ip);
        storage_key = uploaded.key;
        fileMeta = { mime_type: uploaded.type, file_size: uploaded.size };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error procesando archivo";
        return { success: false, error: msg, status: 400 };
      }
    }

    // Create document record with storage_key
    const id = await this.repo.create({ ...data, storage_key }, clinicId);
    await logAudit(this.env, clinicId, userId, "documents", "create", "documents", id,
      undefined, JSON.stringify({ ...data, file: fileMeta }), ip, undefined, "info",
      { correlationId: `doc-create-${id}` });
    return { success: true, data: { id } };
  }

  async signDocument(clinicId: number, id: number, signedBy: string, userId: number, ip: string, signature?: string) {
    const before = await this.repo.findById(id, clinicId);
    if (!before) return { success: false, error: "Documento no encontrado", status: 404 };
    if (before.status === 'ARCHIVED' || before.status === 'SUPERSEDED') {
      return { success: false, error: `No se puede firmar un documento ${before.status}`, status: 400 };
    }
    const ok = await this.repo.sign(id, clinicId, signedBy);
    if (!ok) return { success: false, error: "No se pudo firmar", status: 400 };

    // Persistir el hash de firma digital en metadata (sin perder metadata existente)
    if (signature) {
      let meta: Record<string, unknown> = {};
      try { if (before.metadata) meta = JSON.parse(before.metadata); } catch { meta = {}; }
      meta.signature_hash = signature;
      meta.signature_signed_by = signedBy;
      meta.signature_signed_at = new Date().toISOString();
      await this.env.DB
        .prepare("UPDATE documents SET metadata = ? WHERE id = ? AND clinic_id = ?")
        .bind(JSON.stringify(meta), id, clinicId)
        .run();
    }

    const auditOk = await batchExecute(this.env, [
      { sql: "INSERT INTO audit_logs (clinic_id, user_id, module, action, entity, entity_id, before_data, after_data, ip, request_id, session_id, correlation_id, result, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))", bindings: [clinicId, userId, "documents", "sign", "documents", id, JSON.stringify({ status: before.status }), JSON.stringify({ status: "SIGNED", signed_by: signedBy }), ip, null, null, `doc-sign-${id}`, "SUCCESS", "info"] },
    ]);
    return { success: true, data: null };
  }

  async archiveDocument(clinicId: number, id: number, userId: number, ip: string) {
    const before = await this.repo.findById(id, clinicId);
    if (!before) return { success: false, error: "Documento no encontrado", status: 404 };
    if (before.status === 'ARCHIVED' || before.status === 'SUPERSEDED') {
      return { success: false, error: `El documento ya está ${before.status}`, status: 400 };
    }
    const ok = await this.repo.archive(id, clinicId);
    if (!ok) return { success: false, error: "No se pudo archivar", status: 400 };
    await logAudit(this.env, clinicId, userId, "documents", "archive", "documents", id,
      JSON.stringify({ status: before.status }), JSON.stringify({ status: "ARCHIVED" }),
      ip, undefined, "warning");
    return { success: true, data: null };
  }

  async supersedeDocument(clinicId: number, id: number, newVersion: DocumentInput, userId: number, ip: string) {
    const before = await this.repo.findById(id, clinicId);
    if (!before) return { success: false, error: "Documento no encontrado", status: 404 };
    if (before.status === 'ARCHIVED' || before.status === 'SUPERSEDED') {
      return { success: false, error: `No se puede superseder un documento ${before.status}`, status: 400 };
    }
    if (!newVersion.document_type) return { success: false, error: "document_type requerido", status: 400 };

    let storage_key: string | undefined;
    if (newVersion.file && newVersion.file.content) {
      try {
        const uploaded = await this.handleFileUpload({ ...newVersion, patient_id: before.patient_id }, clinicId, userId, ip);
        storage_key = uploaded.key;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error procesando archivo";
        return { success: false, error: msg, status: 400 };
      }
    }

    await this.repo.supersede(id, clinicId);
    const newId = await this.repo.create({ ...newVersion, patient_id: before.patient_id, storage_key }, clinicId);
    const auditOk = await batchExecute(this.env, [
      { sql: "INSERT INTO audit_logs (clinic_id, user_id, module, action, entity, entity_id, before_data, after_data, ip, request_id, session_id, correlation_id, result, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))", bindings: [clinicId, userId, "documents", "supersede", "documents", id, JSON.stringify({ version: before.version }), JSON.stringify({ new_id: newId }), ip, null, null, `doc-supersede-${id}`, "WARNING", "warning"] },
    ]);
    return { success: true, data: { newId } };
  }

  private async handleFileUpload(data: DocumentInput, clinicId: number, userId: number, ip: string): Promise<UploadResult> {
    const file = data.file as { name?: string; type?: string; content?: string; size?: number };
    if (!file || !file.content) throw new Error("Archivo requerido");
    if (!file.type) throw new Error("Tipo de archivo requerido");

    // 10MB size limit
    const sizeBytes = (file.content.length * 3) / 4;
    if (sizeBytes > 10 * 1024 * 1024) throw new Error("Archivo demasiado grande (máx 10MB)");

    // Validate content type based on document_type
    const allowedTypes: Record<string, string[]> = {
      'CONSENTIMIENTO_INFORMADO': ['application/pdf'],
      'AVISO_PRIVACIDAD': ['application/pdf', 'text/plain'],
      'EXPEDIENTE': ['application/pdf', 'image/png', 'image/jpeg'],
      'NOTA_CLINICA': ['application/pdf', 'image/png', 'image/jpeg'],
      'EVALUACION': ['application/pdf', 'image/png', 'image/jpeg'],
      'PLAN_TRATAMIENTO': ['application/pdf'],
      'FORMATO_ADMISION': ['application/pdf', 'text/plain'],
      'RECETA': ['application/pdf', 'image/png', 'image/jpeg'],
      'REFERENCIA': ['application/pdf'],
      'CONTRATO': ['application/pdf'],
    };
    const allowed = allowedTypes[data.document_type] || ['application/pdf'];
    if (!allowed.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido para ${data.document_type} (se espera: ${allowed.join(', ')})`);
    }

    const content = this.base64ToArrayBuffer(file.content);
    await scanFileForViruses(content);

    const bucket = this.env.CLINIC_DOCUMENTS_BUCKET;
    if (!bucket) throw new Error("R2 no configurado para documentos");

    const storageKey = `clinic-${clinicId}/patient-${data.patient_id}/${crypto.randomUUID()}-${Date.now()}`;
    const object = await bucket.put(storageKey, content, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "private, max-age=0, must-revalidate",
      },
      customMetadata: {
        original_name: file.name || "documento",
        uploader_id: String(userId),
        uploaded_at: new Date().toISOString(),
        ip,
      },
    });

    return { key: object.key, type: file.type, size: file.size || content.byteLength, name: file.name };
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Mock virus scan function
async function scanFileForViruses(content: ArrayBuffer) {
  // In production: integrate with actual virus scanning service
  // For now, simple heuristic checks
  if (!content || content.byteLength === 0) return;
  if (content.byteLength > 10 * 1024 * 1024) {
    throw new Error("File too large");
  }
}
