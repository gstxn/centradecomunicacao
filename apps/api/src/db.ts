import pkg from 'pg';
import type { PoolClient } from 'pg';
const { Pool } = pkg;

let _pool: InstanceType<typeof Pool> | null = null;

export const getPool = (): InstanceType<typeof Pool> => {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL ?? 'postgresql://central_runtime:central_runtime_local_2026@localhost:5432/central_comunicacao';
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    _pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 4000,
      idleTimeoutMillis: 10000,
      max: 5,
      ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });
  }
  return _pool;
};

export const pool = new Proxy({} as InstanceType<typeof Pool>, {
  get(_target, prop) {
    const p = getPool();
    const val = (p as any)[prop];
    return typeof val === 'function' ? val.bind(p) : val;
  }
});

export const withTenantTransaction = async <T>(companyId: string, operation: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.company_id', $1, true)", [companyId]);
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
