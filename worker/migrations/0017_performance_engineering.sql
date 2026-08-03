-- FASE 4: Performance Engineering

CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now')),
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ms',
  category TEXT NOT NULL,
  tags TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time ON performance_metrics(metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_category ON performance_metrics(category);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

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
  is_anomaly INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_slow_queries_timestamp ON slow_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_slow_queries_duration ON slow_queries(duration_ms);
CREATE INDEX IF NOT EXISTS idx_slow_queries_endpoint ON slow_queries(endpoint);
CREATE INDEX IF NOT EXISTS idx_slow_queries_anomaly ON slow_queries(is_anomaly);

CREATE TABLE IF NOT EXISTS query_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  total_executions INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  avg_duration_ms REAL DEFAULT 0,
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,
  last_executed DATETIME,
  tables_involved TEXT,
  index_usage TEXT,
  optimization_suggestions TEXT
);
CREATE INDEX IF NOT EXISTS idx_query_profiles_avg_duration ON query_profiles(avg_duration_ms);
CREATE INDEX IF NOT EXISTS idx_query_profiles_executions ON query_profiles(total_executions);

CREATE TABLE IF NOT EXISTS cache_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now')),
  cache_type TEXT NOT NULL,
  key_pattern TEXT,
  hits INTEGER DEFAULT 0,
  misses INTEGER DEFAULT 0,
  evictions INTEGER DEFAULT 0,
  size_bytes INTEGER,
  ttl_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS idx_cache_stats_type_time ON cache_stats(cache_type, timestamp);

CREATE TABLE IF NOT EXISTS worker_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now')),
  worker_version TEXT,
  cpu_time_ms INTEGER,
  wall_time_ms INTEGER,
  memory_mb INTEGER,
  requests_per_minute REAL,
  errors_per_minute REAL,
  cold_starts INTEGER,
  queue_wait_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_worker_performance_timestamp ON worker_performance(timestamp);