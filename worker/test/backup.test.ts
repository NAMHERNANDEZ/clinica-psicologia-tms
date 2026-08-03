import { describe, it, expect } from 'vitest';

function calcScore(open: number, critical: number, high: number): number {
  return Math.max(0, Math.round(100 - (critical * 30) - (high * 15) - (open * 5)));
}

function generateBackupKey(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  return `backups/clinica-tms-db_${date}_${time}.json`;
}

describe('Backup key generation', () => {
  it('matches expected format', () => {
    const key = generateBackupKey();
    expect(key).toMatch(/^backups\/clinica-tms-db_\d{8}_\d{6}\.json$/);
  });

  it('contains date components', () => {
    const key = generateBackupKey();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(key).toContain(today);
  });

  it('contains timestamp components', () => {
    const key = generateBackupKey();
    // Extract time part after date: backups/clinica-tms-db_YYYYMMDD_HHMMSS.json
    const timePart = key.match(/_(\d{6})\.json$/);
    expect(timePart).not.toBeNull();
    const hours = parseInt(timePart![1].slice(0, 2));
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThanOrEqual(23);
  });
});

describe('Score calculation (backup independent)', () => {
  it('100 with no alerts', () => {
    expect(calcScore(0, 0, 0)).toBe(100);
  });

  it('drops by 30 per critical', () => {
    expect(calcScore(1, 1, 0)).toBe(65);
  });

  it('drops by 15 per high', () => {
    expect(calcScore(0, 0, 2)).toBe(70);
  });

  it('drops by 5 per open', () => {
    expect(calcScore(3, 0, 0)).toBe(85);
  });

  it('floor at 0', () => {
    expect(calcScore(0, 10, 0)).toBe(0);
  });

  it('hybrid scenario', () => {
    expect(calcScore(5, 2, 3)).toBe(0);
  });
});

describe('SHA-256 hex encoding', () => {
  it('produces 64 char hex string', async () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode('test-data');
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(hex).toHaveLength(64);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different inputs produce different hashes', async () => {
    const encoder = new TextEncoder();
    const h1 = await crypto.subtle.digest('SHA-256', encoder.encode('data1'));
    const h2 = await crypto.subtle.digest('SHA-256', encoder.encode('data2'));
    expect(new Uint8Array(h1)).not.toEqual(new Uint8Array(h2));
  });
});
