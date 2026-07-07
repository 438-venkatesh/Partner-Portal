import { dbPool } from './index';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Split SQL on semicolons outside of single-quoted literals (handles PostgreSQL '' escapes).
 * Avoids naive `.split(';')` breaking `DEFAULT '[]'` and similar.
 */
function stripLeadingLineComments(sql: string): string {
  let s = sql.trim();
  while (s.length > 0 && s.startsWith('--')) {
    const nl = s.indexOf('\n');
    if (nl === -1) return '';
    s = s.slice(nl + 1).trim();
  }
  return s.trim();
}

/** Split SQL on semicolons outside single-quoted literals (PostgreSQL '' escapes). */
export function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inSingle = false;

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const next = sql[i + 1];

    if (c === "'") {
      if (inSingle && next === "'") {
        buf += "''";
        i++;
        continue;
      }
      inSingle = !inSingle;
      buf += c;
      continue;
    }

    if (c === ';' && !inSingle) {
      const s = buf.trim();
      if (s.length > 0) {
        out.push(s);
      }
      buf = '';
      continue;
    }

    buf += c;
  }

  const tail = buf.trim();
  if (tail.length > 0) {
    out.push(tail);
  }

  return out;
}

async function migrate() {
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration file(s)`);

    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      console.log(`\n📄 Running migration: ${migrationFile}`);

      let migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      migrationSQL = migrationSQL.replace(/-->\s*statement-breakpoint\s*/g, '');

      const statements = splitSqlStatements(migrationSQL);

      for (const statement of statements) {
        const stmt = stripLeadingLineComments(statement);
        if (!stmt) continue;
        try {
          await dbPool.query(stmt);
        } catch (error: unknown) {
          const err = error as { code?: string; cause?: { code?: string }; message?: string };
          const errorCode = err?.code || err?.cause?.code;
          const errorMessage = err?.message || err?.cause?.message || '';

          if (
            errorCode === '42P07' ||
            errorCode === '42710' ||
            errorCode === '42P16' ||
            errorMessage.includes('already exists') ||
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('duplicate_object')
          ) {
            console.log(`  ⚠️  Skipping (already exists): ${stmt.substring(0, 80)}...`);
            continue;
          }
          console.error(`  ❌ Error executing statement: ${errorMessage}`);
          throw error;
        }
      }

      console.log(`  ✅ Completed: ${migrationFile}`);
    }

    console.log('\n✅ All migrations completed successfully');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
