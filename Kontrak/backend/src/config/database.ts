import sql from 'mssql';
import path from 'path'; import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? path.resolve(__dirname, '../../.env') });
const config: sql.config = { server: process.env.DB_SERVER ?? 'localhost', database: process.env.DB_DATABASE, user: process.env.DB_USER, password: process.env.DB_PASSWORD, port: Number(process.env.DB_PORT ?? 1433), options: { encrypt: process.env.DB_ENCRYPT === 'true', trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' }, pool: { max: 10, min: 0, idleTimeoutMillis: 30000 } };
let poolPromise: Promise<sql.ConnectionPool> | undefined;
export function getPool() { if (!poolPromise) poolPromise = new sql.ConnectionPool(config).connect(); return poolPromise; }
