import type { Env, DocumentType } from "../../types";
import { DocumentRepository, type DocumentInput } from "./repository";
import { logAudit } from "../../lib/audit";
import { batchExecute } from "../../lib/transaction";

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

  async createDocument(clinicId: number, data: DocumentInput, userId: number, ip: string) {
    const id = await this.repo.create(data, clinicId);
    await logAudit(this.env, clinicId, userId, "documents", "create", "documents", id,
      undefined, JSON.stringify(data), ip, undefined, "info",
      { correlationId: `doc-create-${id}` });
    return { success: true, data: { id } };
  }

  async signDocument(clinicId: number, id: number, signedBy: string, userId: number, ip: string) {
    const before = await this.repo.findById(id, clinicId);
    if (!before) return { success: false, error: "Documento no encontrado", status: 404 };
    const ok = await this.repo.sign(id, clinicId, signedBy);
    if (!ok) return { success: false, error: "No se pudo firmar", status: 400 };
    const auditOk = await batchExecute(this.env, [
      { sql: "INSERT INTO audit_logs (clinic_id, user_id, module, action, entity, entity_id, before_data, after_data, ip, request_id, session_id, correlation_id, result, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))", bindings: [clinicId, userId, "documents", "sign", "documents", id, JSON.stringify({ status: before.status }), JSON.stringify({ status: "SIGNED", signed_by: signedBy }), ip, null, null, `doc-sign-${id}`, "SUCCESS", "info"] },
    ]);
    return { success: true, data: null };
  }

  async archiveDocument(clinicId: number, id: number, userId: number, ip: string) {
    const before = await this.repo.findById(id, clinicId);
    if (!before) return { success: false, error: "Documento no encontrado", status: 404 };
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
    await this.repo.supersede(id, clinicId);
    const newId = await this.repo.create({ ...newVersion, patient_id: before.patient_id }, clinicId);
    const auditOk = await batchExecute(this.env, [
      { sql: "INSERT INTO audit_logs (clinic_id, user_id, module, action, entity, entity_id, before_data, after_data, ip, request_id, session_id, correlation_id, result, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))", bindings: [clinicId, userId, "documents", "supersede", "documents", id, JSON.stringify({ version: before.version }), JSON.stringify({ new_id: newId }), ip, null, null, `doc-supersede-${id}`, "WARNING", "warning"] },
    ]);
    return { success: true, data: { newId } };
  }
}