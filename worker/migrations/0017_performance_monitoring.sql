-- FASE 4: Performance Monitoring

CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now')),
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('api','database','cache','worker','compliance','backup','auth')),
  tags TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_category ON performance_metrics(category);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON performance_metrics(metric_name, timestamp);

CREATE TABLE IF NOT EXISTS slow_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now')),
  query_text TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  rows_examined INTEGER,
  rows_returned INTEGER,
  index_used TEXT,
  table_names TEXT,
  endpoint TEXT,
  method TEXT,
  request_id TEXT,
  user_id INTEGER,
  clinic_id INTEGER,
  is_anomaly INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_slow_queries_timestamp ON slow_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_slow_queries_endpoint ON slow_queries(endpoint);
CREATE INDEX IF NOT EXISTS idx_slow_queries_duration ON slow_queries(duration_ms);
CREATE INDEX IF NOT EXISTS idx_slow_queries_anomaly ON slow_queries(is_anomaly);
CREATE INDEX IF NOT EXISTS idx_slow_queries_user ON slow_queries(user_id);

CREATE TABLE IF NOT EXISTS query_profiles (
  query_hash TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  total_executions INTEGER NOT NULL DEFAULT 1,
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms REAL NOT NULL DEFAULT 0,
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,
  last_executed DATETIME NOT NULL DEFAULT (datetime('now')),
  tables_involved TEXT,
  index_usage TEXT,
  optimization_suggestions TEXT
);
CREATE INDEX IF NOT EXISTS idx_query_profiles_avg ON query_profiles(avg_duration_ms);

CREATE TABLE IF NOT EXISTS cache_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now')),
  cache_type TEXT NOT NULL,
  key_pattern TEXT,
  hits INTEGER NOT NULL DEFAULT 0,
  misses INTEGER NOT NULL DEFAULT 0,
  evictions INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER,
  ttl_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS idx_cache_stats_timestamp ON cache_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_cache_stats_type ON cache_stats(cache_type);

CREATE TABLE IF NOT EXISTS worker_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now')),
  worker_version TEXT,
  cpu_time_ms INTEGER NOT NULL DEFAULT 0,
  wall_time_ms INTEGER NOT NULL DEFAULT 0,
  memory_mb REAL NOT NULL DEFAULT 0,
  requests_per_minute REAL NOT NULL DEFAULT 0,
  errors_per_minute REAL NOT NULL DEFAULT 0,
  cold_starts INTEGER NOT NULL DEFAULT 0,
  queue_wait_ms INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_worker_perf_timestamp ON worker_performance(timestamp);