import type { Document, DocumentType } from "../../types";

export interface DocumentInput {
  patient_id: number;
  document_type: DocumentType;
  description?: string;
  hash?: string;
  storage_key?: string;
  signed_by?: string;
  signed_at?: string;
  expires_at?: string;
  metadata?: string;
  file?: {
    name?: string;
    type?: string;
    content?: string;
    size?: number;
  };
}

export class DocumentRepository {
  constructor(private env: { DB: D1Database }) {}

  async findByPatient(patientId: number, clinicId: number): Promise<Document[]> {
    const result = await this.env.DB
      .prepare("SELECT * FROM documents WHERE patient_id = ? AND clinic_id = ? ORDER BY created_at DESC")
      .bind(patientId, clinicId)
      .all();
    return (result.results || []) as unknown as Document[];
  }

  async findById(id: number, clinicId: number): Promise<Document | null> {
    const row = await this.env.DB
      .prepare("SELECT * FROM documents WHERE id = ? AND clinic_id = ?")
      .bind(id, clinicId)
      .first();
    return (row as unknown as Document) || null;
  }

  async findByType(patientId: number, type: DocumentType): Promise<Document | null> {
    const row = await this.env.DB
      .prepare("SELECT * FROM documents WHERE patient_id = ? AND document_type = ? AND status NOT IN ('ARCHIVED','SUPERSEDED') ORDER BY version DESC LIMIT 1")
      .bind(patientId, type)
      .first();
    return (row as unknown as Document) || null;
  }

  async findExpiring(days: number): Promise<Document[]> {
    const result = await this.env.DB
      .prepare("SELECT * FROM documents WHERE status = 'SIGNED' AND expires_at IS NOT NULL AND expires_at <= datetime('now', '+?' || ' days') AND expires_at > datetime('now')")
      .bind(days)
      .all();
    return (result.results || []) as unknown as Document[];
  }

  async create(data: DocumentInput, clinicId: number): Promise<number> {
    const result = await this.env.DB
      .prepare(`INSERT INTO documents (clinic_id, patient_id, document_type, status, description, hash, storage_key, signed_by, signed_at, expires_at, metadata)
        VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?)`)
      .bind(clinicId, data.patient_id, data.document_type,
        data.description || null, data.hash || null, data.storage_key || null,
        data.signed_by || null, data.signed_at || null,
        data.expires_at || null, data.metadata || null)
      .run();
    return result.meta.last_row_id as number;
  }

  async sign(id: number, clinicId: number, signedBy: string): Promise<boolean> {
    const r = await this.env.DB
      .prepare("UPDATE documents SET status = 'SIGNED', signed_by = ?, signed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND clinic_id = ?")
      .bind(signedBy, id, clinicId)
      .run();
    return (r.meta.changes ?? 0) > 0;
  }

  async archive(id: number, clinicId: number): Promise<boolean> {
    const r = await this.env.DB
      .prepare("UPDATE documents SET status = 'ARCHIVED', updated_at = datetime('now') WHERE id = ? AND clinic_id = ?")
      .bind(id, clinicId)
      .run();
    return (r.meta.changes ?? 0) > 0;
  }

  async supersede(id: number, clinicId: number): Promise<boolean> {
    const r = await this.env.DB
      .prepare("UPDATE documents SET status = 'SUPERSEDED', updated_at = datetime('now') WHERE id = ? AND clinic_id = ?")
      .bind(id, clinicId)
      .run();
    return (r.meta.changes ?? 0) > 0;
  }

  async delete(id: number, clinicId: number): Promise<boolean> {
    const r = await this.env.DB
      .prepare("DELETE FROM documents WHERE id = ? AND clinic_id = ?")
      .bind(id, clinicId)
      .run();
    return (r.meta.changes ?? 0) > 0;
  }
}