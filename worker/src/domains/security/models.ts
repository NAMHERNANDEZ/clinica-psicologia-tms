export type SecurityEventType = 
  | 'LOGIN_SUCCESS' 
  | 'LOGIN_FAILED' 
  | 'LOGOUT' 
  | 'SESSION_CREATED' 
  | 'SESSION_REVOKED' 
  | 'SESSION_EXPIRED' 
  | 'CONCURRENT_SESSION_LIMIT' 
  | 'BRUTE_FORCE_ATTEMPT' 
  | 'ANOMALY_DETECTED' 
  | 'IP_BLOCKED' 
  | 'IP_UNBLOCKED' 
  | 'GEO_RESTRICTION' 
  | 'DEVICE_NEW' 
  | 'DEVICE_TRUSTED' 
  | 'PASSWORD_CHANGED' 
  | 'MFA_ENABLED' 
  | 'MFA_DISABLED' 
  | 'SECRET_ROTATED' 
  | 'TOKEN_REFRESH' 
  | 'TOKEN_REVOKED' 
  | 'DOCUMENT_INTEGRITY_CHECK' 
  | 'DOCUMENT_INTEGRITY_FAILED' 
  | 'MALWARE_SCAN_TRIGGERED' 
  | 'MALWARE_DETECTED';

export type SecurityEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEvent {
  id?: number;
  timestamp: string;
  event_type: SecurityEventType;
  severity: SecurityEventSeverity;
  user_id?: number;
  clinic_id?: number;
  ip?: string;
  user_agent?: string;
  device_fingerprint?: string;
  country?: string;
  city?: string;
  details: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface BlockedIP {
  id?: number;
  ip: string;
  reason: string;
  blocked_by?: number;
  blocked_at: string;
  expires_at?: string;
  active: number;
}

export interface DeviceFingerprint {
  id?: number;
  user_id: number;
  fingerprint: string;
  user_agent: string;
  ip: string;
  country?: string;
  city?: string;
  is_trusted: number;
  first_seen: string;
  last_seen: string;
}

export interface SessionInfo {
  id?: number;
  user_id: number;
  token_hash: string;
  refresh_token_hash: string;
  device_fingerprint?: string;
  ip: string;
  user_agent: string;
  country?: string;
  city?: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
  revoked: number;
  revoked_by?: number;
  revoked_at?: string;
  revoke_reason?: string;
}

export interface LoginAttempt {
  id?: number;
  ip: string;
  email?: string;
  success: number;
  attempt_count: number;
  first_attempt: string;
  last_attempt: string;
  blocked_until?: string;
}

export interface SecretRotationLog {
  id?: number;
  secret_name: string;
  rotated_at: string;
  rotated_by?: number;
  old_version?: string;
  new_version: string;
  status: 'SUCCESS' | 'FAILED';
  error_message?: string;
}

export interface DocumentIntegrity {
  id?: number;
  document_id: number;
  sha256_hash: string;
  algorithm: string;
  checked_at: string;
  checked_by?: number;
  is_valid: number;
  previous_hash?: string;
  previous_checked_at?: string;
}

export interface SecurityDashboardMetrics {
  totalEvents: number;
  eventsBySeverity: Record<SecurityEventSeverity, number>;
  eventsByType: Record<string, number>;
  blockedIPs: number;
  activeSessions: number;
  failedLogins24h: number;
  anomaliesDetected: number;
  devicesRegistered: number;
  trustedDevices: number;
  documentsScanned: number;
  malwareDetected: number;
  secretsDueRotation: string[];
}