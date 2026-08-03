export async function batchExecute(
  env: { DB: D1Database },
  statements: Array<{ sql: string; bindings?: unknown[] }>,
): Promise<boolean> {
  try {
    const preparedStatements = statements.map((s) => {
      let stmt = env.DB.prepare(s.sql);
      if (s.bindings && s.bindings.length > 0) {
        stmt = stmt.bind(...s.bindings);
      }
      return stmt;
    });
    const results = await env.DB.batch(preparedStatements);
    return results.every((r) => r.success);
  } catch (err) {
    console.error('Batch transaction failed:', err);
    return false;
  }
}
