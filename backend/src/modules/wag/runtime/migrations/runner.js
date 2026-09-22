const fs = require("fs");
const path = require("path");
const { sql, poolPromise } = require("../config/db");
const logger = require("../utils/logger");

// Migration runner sederhana & deterministik:
// - file .sql bernomor di folder ini (001_*.sql, 002_*.sql, ...)
// - diterapkan sekali, dicatat di tabel schema_migrations
// - idempotent: setiap migrasi harus aman dijalankan ulang (pakai IF NOT EXISTS)

async function ensureMigrationsTable(db) {
  await db.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'schema_migrations')
    BEGIN
      CREATE TABLE schema_migrations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT GETDATE()
      );
      CREATE UNIQUE INDEX UQ_schema_migrations_name ON schema_migrations(name);
    END
  `);
}

async function runMigrations() {
  const db = await poolPromise;
  await ensureMigrationsTable(db);

  const dir = __dirname;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  const appliedResult = await db.request().query("SELECT name FROM schema_migrations");
  const appliedSet = new Set(appliedResult.recordset.map((r) => r.name));

  let appliedCount = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sqlContent = fs.readFileSync(path.join(dir, file), "utf8");
    await db.request().batch(sqlContent);

    await db
      .request()
      .input("name", sql.NVarChar(255), file)
      .query("INSERT INTO schema_migrations (name) VALUES (@name)");

    logger.info(`migration applied: ${file}`);
    appliedCount++;
  }

  if (appliedCount === 0) {
    logger.info("migrations: up to date");
  }
  return appliedCount;
}

module.exports = { runMigrations };
