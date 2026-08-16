import pkg from 'pg';
import type { PoolClient } from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL ?? 'postgresql://central_runtime:central_runtime_local_2026@localhost:5432/central_comunicacao';

export const pool = new Pool({
  connectionString
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
