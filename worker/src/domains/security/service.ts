import type { Env } from "../../types";
import { SecurityRepository } from "./repository";
import type { SecurityEvent, BlockedIP, DeviceFingerprint, SessionInfo, LoginAttempt, SecretRotationLog, DocumentIntegrity, SecurityDashboardMetrics, SecurityEventType, SecurityEventSeverity } from "./models";

export class SecurityService {
  private repo: SecurityRepository;

  constructor(private env: Env) {
    this.repo = new SecurityRepository(env);
  }

  async logSecurityEvent(event: Omit<SecurityEvent, "id" | "timestamp">): Promise<number> {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    return this.repo.saveSecurityEvent(fullEvent);
  }

  async blockIP(ip: string, reason: string, blockedBy?: number, expiresAt?: string): Promise<number> {
    const result = await this.repo.blockIP(ip, reason, blockedBy, expiresAt);
    await this.logSecurityEvent({
      event_type: "IP_BLOCKED",
      severity: "HIGH",
      user_id: blockedBy,
      ip,
      details: { reason, expires_at: expiresAt },
    });
    return result;
  }

  async unblockIP(ip: string, unblockedBy?: number): Promise<void> {
    await this.repo.unblockIP(ip);
    await this.logSecurityEvent({
      event_type: "IP_UNBLOCKED",
      severity: "MEDIUM",
      user_id: unblockedBy,
      ip,
      details: {},
    });
  }

  async checkIPBlocked(ip: string): Promise<BlockedIP | null> {
    return this.repo.isIPBlocked(ip);
  }

  async checkIPReputation(ip: string): Promise<{ blocked: boolean; reason?: string }> {
    const blocked = await this.repo.isIPBlocked(ip);
    if (blocked) {
      return { blocked: true, reason: blocked.reason };
    }
    return { blocked: false };
  }

  async detectAnomalies(userId: number, ip: string, userAgent: string, action: string): Promise<SecurityEvent[]> {
    const anomalies: SecurityEvent[] = [];
    const fingerprint = await this.generateDeviceFingerprint(userAgent, ip);
    
    const knownDevices = await this.repo.getDeviceFingerprints(userId);
    const isKnownDevice = knownDevices.some(d => d.fingerprint === fingerprint);
    const isTrustedDevice = knownDevices.some(d => d.fingerprint === fingerprint && d.is_trusted === 1);

    if (!isKnownDevice) {
      anomalies.push({
        timestamp: new Date().toISOString(),
        event_type: "ANOMALY_DETECTED",
        severity: "MEDIUM",
        user_id: userId,
        ip,
        user_agent: userAgent,
        device_fingerprint: fingerprint,
        details: { action, reason: "unknown_device", fingerprint },
      });
    } else if (!isTrustedDevice) {
      anomalies.push({
        timestamp: new Date().toISOString(),
        event_type: "ANOMALY_DETECTED",
        severity: "LOW",
        user_id: userId,
        ip,
        user_agent: userAgent,
        device_fingerprint: fingerprint,
        details: { action, reason: "untrusted_device", fingerprint },
      });
    }

    const recentEvents = await this.repo.getSecurityEvents(50, new Date(Date.now() - 60 * 60 * 1000).toISOString());
    const userEvents = recentEvents.filter(e => e.user_id === userId);
    const uniqueIPs = new Set(userEvents.map(e => e.ip).filter(Boolean));
    if (uniqueIPs.size > 3) {
      anomalies.push({
        timestamp: new Date().toISOString(),
        event_type: "ANOMALY_DETECTED",
        severity: "HIGH",
        user_id: userId,
        ip,
        user_agent: userAgent,
        device_fingerprint: fingerprint,
        details: { action, reason: "multiple_ips", ip_count: uniqueIPs.size, ips: Array.from(uniqueIPs) },
      });
    }

    for (const anomaly of anomalies) {
      await this.repo.saveSecurityEvent(anomaly);
    }

    return anomalies;
  }

  async getSecurityDashboardMetrics(clinicId: number, since: string) {
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
      device_trust_ratio: totalDevices?.cnt && totalDevices.cnt > 0 ? (trustedDevices?.cnt || 0) / totalDevices.cnt : 1,
      integrity_checks_passed: integrityPassed?.cnt || 0,
      integrity_checks_failed: integrityFailed?.cnt || 0,
      secret_rotations_pending: secretRotations?.cnt || 0,
    };
  }

  async generateDeviceFingerprint(userAgent: string, ip: string): Promise<string> {
    const data = `${userAgent}|${ip}`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async registerDevice(userId: number, userAgent: string, ip: string, country?: string, city?: string): Promise<{ fingerprint: string; isNew: boolean; isTrusted: boolean }> {
    const fingerprint = await this.generateDeviceFingerprint(userAgent, ip);
    const existing = await this.repo.getDeviceFingerprints(userId);
    const knownDevice = existing.find(d => d.fingerprint === fingerprint);
    
    if (knownDevice) {
      await this.repo.saveDeviceFingerprint({
        user_id: userId,
        fingerprint,
        user_agent: userAgent,
        ip,
        country,
        city,
        is_trusted: knownDevice.is_trusted,
        first_seen: knownDevice.first_seen,
        last_seen: new Date().toISOString(),
      });
      return { fingerprint, isNew: false, isTrusted: knownDevice.is_trusted === 1 };
    }

    await this.repo.saveDeviceFingerprint({
      user_id: userId,
      fingerprint,
      user_agent: userAgent,
      ip,
      country,
      city,
      is_trusted: 0,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    });

    await this.logSecurityEvent({
      event_type: "DEVICE_NEW",
      severity: "MEDIUM",
      user_id: userId,
      ip,
      user_agent: userAgent,
      device_fingerprint: fingerprint,
      country,
      city,
      details: { fingerprint },
    });

    return { fingerprint, isNew: true, isTrusted: false };
  }

  async trustDevice(userId: number, fingerprint: string, trustedBy: number): Promise<void> {
    await this.repo.trustDevice(userId, fingerprint);
    await this.logSecurityEvent({
      event_type: "DEVICE_TRUSTED",
      severity: "LOW",
      user_id: userId,
      details: { fingerprint, trusted_by: trustedBy },
    });
  }

  async revokeDeviceTrust(userId: number, fingerprint: string, revokedBy: number): Promise<void> {
    await this.repo.revokeDeviceTrust(userId, fingerprint);
    await this.logSecurityEvent({
      event_type: "DEVICE_TRUSTED",
      severity: "MEDIUM",
      user_id: userId,
      details: { fingerprint, revoked_by: revokedBy, action: "revoked" },
    });
  }

  async createSession(userId: number, token: string, refreshToken: string, deviceFingerprint: string | undefined, ip: string, userAgent: string, country?: string, city?: string): Promise<number> {
    const tokenHash = await this.hashToken(token);
    const refreshTokenHash = await this.hashToken(refreshToken);
    const sessionId = await this.repo.createSession({
      user_id: userId,
      token_hash: tokenHash,
      refresh_token_hash: refreshTokenHash,
      device_fingerprint: deviceFingerprint,
      ip,
      user_agent: userAgent,
      country,
      city,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      last_activity: new Date().toISOString(),
      revoked: 0,
    });

    await this.logSecurityEvent({
      event_type: "SESSION_CREATED",
      severity: "LOW",
      user_id: userId,
      ip,
      user_agent: userAgent,
      device_fingerprint: deviceFingerprint,
      country,
      city,
      details: { session_id: sessionId },
    });

    return sessionId;
  }

  async validateSession(token: string): Promise<SessionInfo | null> {
    const tokenHash = await this.hashToken(token);
    return this.repo.getSessionByTokenHash(tokenHash);
  }

  async validateRefreshToken(refreshToken: string): Promise<SessionInfo | null> {
    const tokenHash = await this.hashToken(refreshToken);
    return this.repo.getSessionByRefreshTokenHash(tokenHash);
  }

  async updateSessionActivity(sessionId: number): Promise<void> {
    await this.repo.updateSessionActivity(sessionId, new Date().toISOString());
  }

  async revokeSession(sessionId: number, revokedBy: number, reason: string): Promise<void> {
    await this.repo.revokeSession(sessionId, revokedBy, reason);
    await this.logSecurityEvent({
      event_type: "SESSION_REVOKED",
      severity: "MEDIUM",
      user_id: revokedBy,
      details: { session_id: sessionId, reason, revoked_by: revokedBy },
    });
  }

  async revokeAllUserSessions(userId: number, revokedBy: number, reason: string): Promise<void> {
    await this.repo.revokeAllUserSessions(userId, revokedBy, reason);
    await this.logSecurityEvent({
      event_type: "SESSION_REVOKED",
      severity: "HIGH",
      user_id: revokedBy,
      details: { target_user_id: userId, reason, revoked_by: revokedBy, all_sessions: true },
    });
  }

  async checkConcurrentSessions(userId: number, maxSessions = 5): Promise<{ allowed: boolean; currentCount: number }> {
    const sessions = await this.repo.getUserSessions(userId);
    if (sessions.length >= maxSessions) {
      await this.logSecurityEvent({
        event_type: "CONCURRENT_SESSION_LIMIT",
        severity: "MEDIUM",
        user_id: userId,
        details: { current_sessions: sessions.length, max_sessions: maxSessions },
      });
      return { allowed: false, currentCount: sessions.length };
    }
    return { allowed: true, currentCount: sessions.length };
  }

  async recordLoginAttempt(ip: string, email: string | undefined, success: boolean): Promise<{ blocked: boolean; attemptCount: number }> {
    const attempt = await this.repo.getLoginAttempts(ip, email);
    const attemptCount = attempt ? attempt.attempt_count + 1 : 1;
    const firstAttempt = attempt ? attempt.first_attempt : new Date().toISOString();
    const lastAttempt = new Date().toISOString();
    
    let blockedUntil: string | undefined;
    if (!success && attemptCount >= 5) {
      blockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await this.logSecurityEvent({
        event_type: "BRUTE_FORCE_ATTEMPT",
        severity: "HIGH",
        ip,
        details: { email, attempt_count: attemptCount, blocked_until: blockedUntil },
      });
    }

    await this.repo.recordLoginAttempt({
      ip,
      email,
      success: success ? 1 : 0,
      attempt_count: attemptCount,
      first_attempt: firstAttempt,
      last_attempt: lastAttempt,
      blocked_until: blockedUntil,
    });

    return { blocked: !!blockedUntil, attemptCount };
  }

  async checkBruteForce(ip: string, email?: string): Promise<{ blocked: boolean; attemptCount: number }> {
    const attempt = await this.repo.getLoginAttempts(ip, email);
    if (!attempt) return { blocked: false, attemptCount: 0 };
    
    const isBlocked = !!(attempt.blocked_until && new Date(attempt.blocked_until) > new Date());
    return { blocked: isBlocked, attemptCount: attempt.attempt_count };
  }

  async rotateSecret(secretName: string, newValue: string, rotatedBy?: number): Promise<boolean> {
    const oldValue = this.env[secretName as keyof Env] as string | undefined;
    const envRecord = this.env as unknown as Record<string, string>;
    envRecord[secretName] = newValue;
    
    await this.repo.logSecretRotation({
      secret_name: secretName,
      rotated_at: new Date().toISOString(),
      rotated_by: rotatedBy,
      old_version: oldValue ? await this.generateDeviceFingerprint(oldValue, "salt") : undefined,
      new_version: await this.generateDeviceFingerprint(newValue, "salt"),
      status: "SUCCESS",
    });

    await this.logSecurityEvent({
      event_type: "SECRET_ROTATED",
      severity: "HIGH",
      user_id: rotatedBy,
      details: { secret_name: secretName },
    });

    return true;
  }

  async scheduleSecretRotations(): Promise<void> {
    const secrets = ["JWT_SECRET", "REFRESH_SECRET", "ENCRYPTION_KEY"];
    for (const secret of secrets) {
      const history = await this.repo.getSecretRotationHistory(secret, 1);
      const lastRotation = history[0];
      if (!lastRotation || new Date(lastRotation.rotated_at) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
        await this.logSecurityEvent({
          event_type: "SECRET_ROTATED",
          severity: "MEDIUM",
          details: { secret_name: secret, action: "rotation_due" },
        });
      }
    }
  }

  async verifyDocumentIntegrity(documentId: number, content: Uint8Array, checkedBy?: number): Promise<{ valid: boolean; hash: string }> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const previous = await this.repo.getLatestDocumentIntegrity(documentId);
    const isValid = !previous || previous.sha256_hash === hash;

    await this.repo.saveDocumentIntegrity({
      document_id: documentId,
      sha256_hash: hash,
      algorithm: "SHA-256",
      checked_at: new Date().toISOString(),
      checked_by: checkedBy,
      is_valid: isValid ? 1 : 0,
      previous_hash: previous?.sha256_hash,
      previous_checked_at: previous?.checked_at,
    });

    await this.logSecurityEvent({
      event_type: isValid ? "DOCUMENT_INTEGRITY_CHECK" : "DOCUMENT_INTEGRITY_FAILED",
      severity: isValid ? "LOW" : "CRITICAL",
      user_id: checkedBy,
      details: { document_id: documentId, hash, previous_hash: previous?.sha256_hash, valid: isValid },
    });

    return { valid: isValid, hash };
  }

  async getDocumentIntegrityHistory(documentId: number): Promise<DocumentIntegrity[]> {
    return this.repo.getDocumentIntegrityHistory(documentId);
  }

  async scanDocumentForMalware(documentId: number, content: Uint8Array, triggeredBy: number): Promise<{ clean: boolean; threats: string[] }> {
    const threats: string[] = [];
    const view = new DataView(content.buffer, content.byteOffset, content.byteLength);
    
    if (content.length > 50 * 1024 * 1024) {
      threats.push("File size exceeds 50MB limit");
    }

    const suspiciousPatterns = [
      new Uint8Array([0x4D, 0x5A]), // PE executable
      new Uint8Array([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
      new Uint8Array([0x25, 0x50, 0x44, 0x46]), // PDF with potential scripts
    ];

    for (const pattern of suspiciousPatterns) {
      if (this.containsPattern(content, pattern)) {
        threats.push(`Suspicious binary pattern detected: ${Array.from(pattern).map(b => b.toString(16).padStart(2, "0")).join(" ")}`);
      }
    }

    await this.logSecurityEvent({
      event_type: threats.length > 0 ? "MALWARE_DETECTED" : "MALWARE_SCAN_TRIGGERED",
      severity: threats.length > 0 ? "CRITICAL" : "LOW",
      user_id: triggeredBy,
      details: { document_id: documentId, threats, file_size: content.length },
    });

    return { clean: threats.length === 0, threats };
  }

  private containsPattern(content: Uint8Array, pattern: Uint8Array): boolean {
    if (pattern.length > content.length) return false;
    for (let i = 0; i <= content.length - pattern.length; i++) {
      let match = true;
      for (let j = 0; j < pattern.length; j++) {
        if (content[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async getSecurityDashboard(clinicId: number): Promise<SecurityDashboardMetrics> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const metrics = await this.getSecurityDashboardMetrics(clinicId, since);
    
    return {
      totalEvents: metrics.total_events_24h,
      eventsBySeverity: metrics.events_by_severity as Record<SecurityEventSeverity, number>,
      eventsByType: metrics.events_by_type,
      blockedIPs: metrics.blocked_ips_count,
      activeSessions: metrics.active_sessions,
      failedLogins24h: metrics.failed_logins_24h,
      anomaliesDetected: metrics.anomalies_detected_24h,
      devicesRegistered: 0,
      trustedDevices: 0,
      documentsScanned: metrics.integrity_checks_passed + metrics.integrity_checks_failed,
      malwareDetected: metrics.integrity_checks_failed,
      secretsDueRotation: [],
    };
  }

  async getBlockedIPs(limit = 100): Promise<BlockedIP[]> {
    return this.repo.getBlockedIPs(limit);
  }

  async getActiveSessions(userId: number): Promise<SessionInfo[]> {
    return this.repo.getUserSessions(userId);
  }

  async cleanup(): Promise<{ expiredSessions: number; oldLoginAttempts: number }> {
    const expiredSessions = await this.repo.cleanupExpiredSessions();
    const oldLoginAttempts = await this.repo.cleanupOldLoginAttempts(7);
    return { expiredSessions, oldLoginAttempts };
  }
}