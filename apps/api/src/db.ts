import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL ?? 'postgresql://central_app:central_local_2026@localhost:5432/central_comunicacao';

export const pool = new Pool({
  connectionString
});
