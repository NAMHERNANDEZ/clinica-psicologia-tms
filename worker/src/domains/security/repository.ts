import type { Env } from "../../types";
import type { SecurityEvent, BlockedIP, DeviceFingerprint, SessionInfo, LoginAttempt, SecretRotationLog, DocumentIntegrity } from "./models";

export class SecurityRepository {
  constructor(private env: { DB: D1Database }) {}

  async saveSecurityEvent(event: SecurityEvent): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO security_events (timestamp, event_type, severity, user_id, clinic_id, ip, user_agent, device_fingerprint, country, city, details, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(
        event.timestamp,
        event.event_type,
        event.severity,
        event.user_id || null,
        event.clinic_id || null,
        event.ip || null,
        event.user_agent || null,
        event.device_fingerprint || null,
        event.country || null,
        event.city || null,
        JSON.stringify(event.details),
        event.metadata ? JSON.stringify(event.metadata) : null
      )
      .run();
    return r.meta.last_row_id as number;
  }

  async getSecurityEvents(limit = 100, since?: string): Promise<SecurityEvent[]> {
    let query = "SELECT * FROM security_events";
    const bindings: unknown[] = [];
    if (since) {
      query += " WHERE timestamp >= ?";
      bindings.push(since);
    }
    query += " ORDER BY timestamp DESC LIMIT ?";
    bindings.push(limit);
    const r = await this.env.DB.prepare(query).bind(...bindings).all();
    return (r.results || []) as unknown as SecurityEvent[];
  }

  async blockIP(ip: string, reason: string, blockedBy?: number, expiresAt?: string): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO blocked_ips (ip, reason, blocked_by, blocked_at, expires_at, is_active) VALUES (?, ?, ?, datetime('now'), ?, 1) ON CONFLICT(ip) DO UPDATE SET reason = ?, expires_at = ?, is_active = 1, blocked_at = datetime('now'), blocked_by = ?")
      .bind(ip, reason, blockedBy || null, expiresAt || null, reason, expiresAt || null, blockedBy || null)
      .run();
    return r.meta.last_row_id as number;
  }

  async unblockIP(ip: string): Promise<void> {
    await this.env.DB.prepare("UPDATE blocked_ips SET is_active = 0 WHERE ip = ?").bind(ip).run();
  }

  async isIPBlocked(ip: string): Promise<BlockedIP | null> {
    const r = await this.env.DB.prepare("SELECT * FROM blocked_ips WHERE ip = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))").bind(ip).first();
    return (r as unknown as BlockedIP) || null;
  }

  async getBlockedIPs(limit = 100): Promise<BlockedIP[]> {
    const r = await this.env.DB.prepare("SELECT * FROM blocked_ips WHERE is_active = 1 ORDER BY blocked_at DESC LIMIT ?").bind(limit).all();
    return (r.results || []) as unknown as BlockedIP[];
  }

  async saveDeviceFingerprint(device: DeviceFingerprint): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO device_fingerprints (user_id, fingerprint, user_agent, ip, country, city, is_trusted, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, fingerprint) DO UPDATE SET last_seen = ?, ip = ?, country = ?, city = ?")
      .bind(device.user_id, device.fingerprint, device.user_agent, device.ip, device.country || null, device.city || null, device.is_trusted, device.first_seen, device.last_seen, device.last_seen, device.ip, device.country || null, device.city || null)
      .run();
    return r.meta.last_row_id as number;
  }

  async getDeviceFingerprints(userId: number): Promise<DeviceFingerprint[]> {
    const r = await this.env.DB.prepare("SELECT * FROM device_fingerprints WHERE user_id = ? ORDER BY last_seen DESC").bind(userId).all();
    return (r.results || []) as unknown as DeviceFingerprint[];
  }

  async trustDevice(userId: number, fingerprint: string): Promise<void> {
    await this.env.DB.prepare("UPDATE device_fingerprints SET is_trusted = 1 WHERE user_id = ? AND fingerprint = ?").bind(userId, fingerprint).run();
  }

  async revokeDeviceTrust(userId: number, fingerprint: string): Promise<void> {
    await this.env.DB.prepare("UPDATE device_fingerprints SET is_trusted = 0 WHERE user_id = ? AND fingerprint = ?").bind(userId, fingerprint).run();
  }

  async createSession(session: SessionInfo): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO user_sessions (user_id, token_hash, refresh_token_hash, device_fingerprint, ip, user_agent, country, city, created_at, expires_at, last_activity, revoked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(session.user_id, session.token_hash, session.refresh_token_hash, session.device_fingerprint || null, session.ip, session.user_agent, session.country || null, session.city || null, session.created_at, session.expires_at, session.last_activity, session.revoked)
      .run();
    return r.meta.last_row_id as number;
  }

  async getUserSessions(userId: number): Promise<SessionInfo[]> {
    const r = await this.env.DB.prepare("SELECT * FROM user_sessions WHERE user_id = ? AND revoked = 0 AND expires_at > datetime('now') ORDER BY last_activity DESC").bind(userId).all();
    return (r.results || []) as unknown as SessionInfo[];
  }

  async getSessionByTokenHash(tokenHash: string): Promise<SessionInfo | null> {
    const r = await this.env.DB.prepare("SELECT * FROM user_sessions WHERE token_hash = ?").bind(tokenHash).first();
    return (r as unknown as SessionInfo) || null;
  }

  async getSessionByRefreshTokenHash(refreshTokenHash: string): Promise<SessionInfo | null> {
    const r = await this.env.DB.prepare("SELECT * FROM user_sessions WHERE refresh_token_hash = ?").bind(refreshTokenHash).first();
    return (r as unknown as SessionInfo) || null;
  }

  async updateSessionActivity(sessionId: number, lastActivity: string): Promise<void> {
    await this.env.DB.prepare("UPDATE user_sessions SET last_activity = ? WHERE id = ?").bind(lastActivity, sessionId).run();
  }

  async revokeSession(sessionId: number, revokedBy: number, reason: string): Promise<void> {
    await this.env.DB.prepare("UPDATE user_sessions SET revoked = 1, revoked_at = datetime('now'), revoked_by = ?, revoke_reason = ? WHERE id = ?").bind(revokedBy, reason, sessionId).run();
  }

  async revokeAllUserSessions(userId: number, revokedBy: number, reason: string): Promise<void> {
    await this.env.DB.prepare("UPDATE user_sessions SET revoked = 1, revoked_at = datetime('now'), revoked_by = ?, revoke_reason = ? WHERE user_id = ? AND revoked = 0").bind(revokedBy, reason, userId).run();
  }

  async cleanupExpiredSessions(): Promise<number> {
    const r = await this.env.DB.prepare("UPDATE user_sessions SET revoked = 1, revoked_at = datetime('now'), revoke_reason = 'expired' WHERE expires_at <= datetime('now') AND revoked = 0").run();
    return r.meta.changes || 0;
  }

  async recordLoginAttempt(attempt: LoginAttempt): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO login_attempts (ip, email, success, attempt_count, first_attempt, last_attempt, blocked_until) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(ip, email) DO UPDATE SET attempt_count = ?, last_attempt = ?, blocked_until = ?, success = ?")
      .bind(attempt.ip, attempt.email || null, attempt.success, attempt.attempt_count, attempt.first_attempt, attempt.last_attempt, attempt.blocked_until || null, attempt.attempt_count, attempt.last_attempt, attempt.blocked_until || null, attempt.success)
      .run();
    return r.meta.last_row_id as number;
  }

  async getLoginAttempts(ip: string, email?: string): Promise<LoginAttempt | null> {
    let query = "SELECT * FROM login_attempts WHERE ip = ?";
    const bindings: unknown[] = [ip];
    if (email) {
      query += " AND email = ?";
      bindings.push(email);
    }
    query += " ORDER BY last_attempt DESC LIMIT 1";
    const r = await this.env.DB.prepare(query).bind(...bindings).first();
    return (r as unknown as LoginAttempt) || null;
  }

  async cleanupOldLoginAttempts(days = 7): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const r = await this.env.DB.prepare("DELETE FROM login_attempts WHERE last_attempt < ?").bind(cutoff).run();
    return r.meta.changes || 0;
  }

  async logSecretRotation(log: SecretRotationLog): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO secret_rotation_log (secret_name, rotated_at, rotated_by, old_version, new_version, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(log.secret_name, log.rotated_at, log.rotated_by || null, log.old_version || null, log.new_version || null, log.status, log.error_message || null)
      .run();
    return r.meta.last_row_id as number;
  }

  async getSecretRotationHistory(secretName?: string, limit = 50): Promise<SecretRotationLog[]> {
    let query = "SELECT * FROM secret_rotation_log";
    const bindings: unknown[] = [];
    if (secretName) {
      query += " WHERE secret_name = ?";
      bindings.push(secretName);
    }
    query += " ORDER BY rotated_at DESC LIMIT ?";
    bindings.push(limit);
    const r = await this.env.DB.prepare(query).bind(...bindings).all();
    return (r.results || []) as unknown as SecretRotationLog[];
  }

  async saveDocumentIntegrity(integrity: DocumentIntegrity): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO document_integrity (document_id, sha256_hash, algorithm, checked_at, checked_by, is_valid, previous_hash, previous_checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(integrity.document_id, integrity.sha256_hash, integrity.algorithm, integrity.checked_at, integrity.checked_by || null, integrity.is_valid, integrity.previous_hash || null, integrity.previous_checked_at || null)
      .run();
    return r.meta.last_row_id as number;
  }

  async getDocumentIntegrityHistory(documentId: number, limit = 20): Promise<DocumentIntegrity[]> {
    const r = await this.env.DB.prepare("SELECT * FROM document_integrity WHERE document_id = ? ORDER BY checked_at DESC LIMIT ?").bind(documentId, limit).all();
    return (r.results || []) as unknown as DocumentIntegrity[];
  }

  async getLatestDocumentIntegrity(documentId: number): Promise<DocumentIntegrity | null> {
    const r = await this.env.DB.prepare("SELECT * FROM document_integrity WHERE document_id = ? ORDER BY checked_at DESC LIMIT 1").bind(documentId).first();
    return (r as unknown as DocumentIntegrity) || null;
  }

  async getSecurityDashboardMetrics(clinicId: number, since: string): Promise<{
    total_events_24h: number;
    events_by_severity: Record<string, number>;
    events_by_type: Record<string, number>;
    blocked_ips_count: number;
    active_sessions: number;
    failed_logins_24h: number;
    anomalies_detected_24h: number;
    brute_force_attempts_24h: number;
    device_trust_ratio: number;
    integrity_checks_passed: number;
    integrity_checks_failed: number;
    secret_rotations_pending: number;
  }> {
    const totalEvents = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM security_events WHERE clinic_id = ? AND timestamp >= ?").bind(clinicId, since).first<{ cnt: number }>();
    const severityRows = await this.env.DB.prepare("SELECT severity, COUNT(*) as cnt FROM security_events WHERE clinic_id = ? AND timestamp >= ? GROUP BY severity").bind(clinicId, since).all();
    const typeRows = await this.env.DB.prepare("SELECT event_type, COUNT(*) as cnt FROM security_events WHERE clinic_id = ? AND timestamp >= ? GROUP BY event_type").bind(clinicId, since).all();
    const blockedIPs = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM blocked_ips WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))").first<{ cnt: number }>();
    const activeSessions = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM user_sessions WHERE revoked = 0 AND expires_at > datetime('now')").first<{ cnt: number }>();
    const failedLogins = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM security_events WHERE event_type = 'LOGIN_FAILED' AND timestamp >= ?").bind(since).first<{ cnt: number }>();
    const anomalies = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM security_events WHERE event_type = 'ANOMALY_DETECTED' AND timestamp >= ?").bind(since).first<{ cnt: number }>();
    const bruteForce = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM security_events WHERE event_type = 'BRUTE_FORCE_ATTEMPT' AND timestamp >= ?").bind(since).first<{ cnt: number }>();
    const totalDevices = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM device_fingerprints").first<{ cnt: number }>();
    const trustedDevices = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM device_fingerprints WHERE is_trusted = 1").first<{ cnt: number }>();
    const integrityPassed = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM document_integrity WHERE is_valid = 1 AND checked_at >= ?").bind(since).first<{ cnt: number }>();
    const integrityFailed = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM document_integrity WHERE is_valid = 0 AND checked_at >= ?").bind(since).first<{ cnt: number }>();
    const secretRotations = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM secret_rotation_log WHERE status = 'PENDING' OR (status = 'SUCCESS' AND rotated_at < datetime('now', '-90 days'))").first<{ cnt: number }>();

    const eventsBySeverity: Record<string, number> = {};
    for (const row of (severityRows.results || []) as { severity: string; cnt: number }[]) {
      eventsBySeverity[row.severity] = row.cnt;
    }
    const eventsByType: Record<string, number> = {};
    for (const row of (typeRows.results || []) as { event_type: string; cnt: number }[]) {
      eventsByType[row.event_type] = row.cnt;
    }

    return {
      total_events_24h: totalEvents?.cnt || 0,
      events_by_severity: eventsBySeverity,
      events_by_type: eventsByType,
      blocked_ips_count: blockedIPs?.cnt || 0,
      active_sessions: activeSessions?.cnt || 0,
      failed_logins_24h: failedLogins?.cnt || 0,
      anomalies_detected_24h: anomalies?.cnt || 0,
      brute_force_attempts_24h: bruteForce?.cnt || 0,
      device_trust_ratio: (totalDevices?.cnt || 0) > 0 ? (trustedDevices?.cnt || 0) / (totalDevices?.cnt || 1) : 1,
      integrity_checks_passed: integrityPassed?.cnt || 0,
      integrity_checks_failed: integrityFailed?.cnt || 0,
      secret_rotations_pending: secretRotations?.cnt || 0,
    };
  }
}