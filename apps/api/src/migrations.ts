import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runMigrations = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    // Cria tabela de controle de migrações se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Busca migrações já aplicadas
    const appliedResult = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((r: { version: string }) => r.version));

    // Localiza os arquivos .sql
    const candidateDirs = [
      path.resolve(__dirname, '../../../database'),
      path.resolve(__dirname, '../../database'),
      path.resolve(process.cwd(), 'database')
    ];

    const migrationsDir = candidateDirs.find((dir) => fs.existsSync(dir));
    if (!migrationsDir) {
      console.warn('[Migrations] Diretório database/ não encontrado. Pulando migrações automáticas.');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql') && !file.includes('supabase_complete_schema'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`[Migrations] Aplicando migração: ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Migrations] Migração ${file} concluída com sucesso.`);
      } catch (migrationError) {
        await client.query('ROLLBACK');
        console.error(`[Migrations] Erro ao aplicar migração ${file}:`, migrationError);
        throw migrationError;
      }
    }
  } catch (error) {
    console.warn('[Migrations] Falha ao executar migrações automáticas:', error instanceof Error ? error.message : error);
  } finally {
    client.release();
  }
};
