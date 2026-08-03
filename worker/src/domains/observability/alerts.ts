import type { Env } from "../../types";
import { ObservabilityService } from "./service";

export interface AlertRule {
  name: string;
  condition: (value: number) => boolean;
  threshold: number;
  level: "WARNING" | "CRITICAL";
  message: (value: number) => string;
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    name: "high_latency",
    condition: (v) => v > 500,
    threshold: 500,
    level: "WARNING",
    message: (v) => `Latency ${v}ms exceeds 500ms threshold`,
  },
  {
    name: "error_rate",
    condition: (v) => v > 5,
    threshold: 5,
    level: "CRITICAL",
    message: (v) => `Error rate ${v}% exceeds 5% threshold`,
  },
  {
    name: "backup_failed",
    condition: (v) => v === 1,
    threshold: 1,
    level: "CRITICAL",
    message: () => "Backup failed in last 24h",
  },
  {
    name: "cron_failed",
    condition: (v) => v === 1,
    threshold: 1,
    level: "CRITICAL",
    message: () => "Compliance cron failed in last 24h",
  },
  {
    name: "d1_saturation",
    condition: (v) => v > 100,
    threshold: 100,
    level: "WARNING",
    message: (v) => `D1 latency ${v}ms exceeds 100ms threshold`,
  },
];

export interface AlertResult {
  rule: string;
  level: "WARNING" | "CRITICAL";
  message: string;
  value: number;
  threshold: number;
  triggered: boolean;
}

export async function evaluateAlerts(env: Env, clinicId: number): Promise<AlertResult[]> {
  const service = new ObservabilityService(env);
  const results: AlertResult[] = [];

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const latencyRows = await env.DB.prepare(
    "SELECT AVG(duration_ms) as avg FROM observability_events WHERE timestamp >= ? AND duration_ms IS NOT NULL"
  ).bind(oneHourAgo).first<{ avg: number }>();

  const avgLatency = latencyRows?.avg || 0;
  const rule = DEFAULT_ALERT_RULES[0];
  results.push({
    rule: rule.name,
    level: rule.level,
    message: rule.message(avgLatency),
    value: avgLatency,
    threshold: rule.threshold,
    triggered: rule.condition(avgLatency),
  });

  const errorCount = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM observability_events WHERE level IN ('ERROR', 'CRITICAL') AND timestamp >= ?"
  ).bind(oneDayAgo).first<{ cnt: number }>();

  const totalCount = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM observability_events WHERE timestamp >= ?"
  ).bind(oneDayAgo).first<{ cnt: number }>();

  const totalCountVal = totalCount?.cnt ?? 0;
  const errorRate = totalCountVal > 0 ? (errorCount?.cnt || 0) / totalCountVal * 100 : 0;
  const errorRule = DEFAULT_ALERT_RULES[1];
  results.push({
    rule: errorRule.name,
    level: errorRule.level,
    message: errorRule.message(errorRate),
    value: errorRate,
    threshold: errorRule.threshold,
    triggered: errorRule.condition(errorRate),
  });

  const backupResult = await env.DB.prepare(
    "SELECT status FROM backup_runs WHERE clinic_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(clinicId).first<{ status: string }>();

  const backupRule = DEFAULT_ALERT_RULES[2];
  const backupFailed = backupResult?.status === "failed" ? 1 : 0;
  results.push({
    rule: backupRule.name,
    level: backupRule.level,
    message: backupRule.message(backupFailed),
    value: backupFailed,
    threshold: backupRule.threshold,
    triggered: backupRule.condition(backupFailed),
  });

  const cronResult = await env.DB.prepare(
    "SELECT created_at FROM compliance_runs ORDER BY id DESC LIMIT 1"
  ).first<{ created_at: string }>();

  const cronRule = DEFAULT_ALERT_RULES[3];
  const cronFailed = cronResult && new Date(cronResult.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000) ? 1 : 0;
  results.push({
    rule: cronRule.name,
    level: cronRule.level,
    message: cronRule.message(cronFailed),
    value: cronFailed,
    threshold: cronRule.threshold,
    triggered: cronRule.condition(cronFailed),
  });

  const d1Latency = await env.DB.prepare(
    "SELECT AVG(duration_ms) as avg FROM observability_events WHERE service = 'database' AND timestamp >= ?"
  ).bind(oneHourAgo).first<{ avg: number }>();

  const d1Rule = DEFAULT_ALERT_RULES[4];
  const d1Avg = d1Latency?.avg || 0;
  results.push({
    rule: d1Rule.name,
    level: d1Rule.level,
    message: d1Rule.message(d1Avg),
    value: d1Avg,
    threshold: d1Rule.threshold,
    triggered: d1Rule.condition(d1Avg),
  });

  return results;
}
