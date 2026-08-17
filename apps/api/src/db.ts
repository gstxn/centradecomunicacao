import pg from 'pg';
import type { PoolClient } from 'pg';

const PoolClass: any = (pg as any).Pool || (pg as any).default?.Pool || (pg as any).default || pg;

let _pool: any = null;

export const getPool = (): any => {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL ?? 'postgresql://central_runtime:central_runtime_local_2026@localhost:5432/central_comunicacao';
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    _pool = new PoolClass({
      connectionString,
      connectionTimeoutMillis: 4000,
      idleTimeoutMillis: 10000,
      max: 5,
      ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });
  }
  return _pool;
};

export const pool: any = new Proxy({}, {
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
