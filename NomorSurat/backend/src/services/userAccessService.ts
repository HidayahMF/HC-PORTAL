import sql from 'mssql';
import { getPool } from '../config/database';
import { authConfig, quoteIdentifier } from '../config/auth';

export type AccessRole = 'ADMIN' | 'HR';
export interface ManagedUser { nip: string; name: string; role: AccessRole; isActive: boolean; }
const accessTable = () => quoteIdentifier(authConfig.accessTable);

export async function searchActiveEmployees(search = ''): Promise<Array<{ nip: string; name: string }>> {
  const pool = await getPool(); const value = search.trim();
  const table = quoteIdentifier(authConfig.hrisTable); const nip = quoteIdentifier(authConfig.hrisNipColumn); const name = quoteIdentifier(authConfig.hrisNameColumn); const active = quoteIdentifier(authConfig.hrisActiveColumn);
  const result = await pool.request().input('search', sql.NVarChar(100), value).input('likeSearch', sql.NVarChar(110), `%${value}%`).query(`SELECT TOP (100) ${nip} AS nip, ${name} AS name FROM ${table} WHERE ${active} IN ('1', 'Y', 'TRUE') AND (@search = '' OR ${nip} LIKE @likeSearch OR ${name} LIKE @likeSearch) ORDER BY ${name};`);
  return result.recordset.map((row: { nip: unknown; name: unknown }) => ({ nip: String(row.nip).trim(), name: String(row.name ?? '').trim() }));
}

export async function listAccess(): Promise<ManagedUser[]> {
  const pool = await getPool(); const hris = quoteIdentifier(authConfig.hrisTable); const nip = quoteIdentifier(authConfig.hrisNipColumn); const name = quoteIdentifier(authConfig.hrisNameColumn);
  const result = await pool.request().query(`SELECT a.NIP AS nip, h.${name} AS name, a.Role AS role, a.IsActive AS isActive FROM ${accessTable()} a INNER JOIN ${hris} h ON h.${nip} = a.NIP ORDER BY h.${name};`);
  return result.recordset.map((row: Record<string, unknown>) => ({ nip: String(row.nip).trim(), name: String(row.name ?? '').trim(), role: String(row.role).toUpperCase() as AccessRole, isActive: Boolean(row.isActive) }));
}

export async function getAccess(nip: string): Promise<{ role: AccessRole; isActive: boolean } | undefined> {
  const result = await (await getPool()).request().input('nip', sql.VarChar(50), nip).query(`SELECT Role AS role, IsActive AS isActive FROM ${accessTable()} WHERE NIP = @nip;`);
  const row = result.recordset[0] as Record<string, unknown> | undefined; return row ? { role: String(row.role).toUpperCase() as AccessRole, isActive: Boolean(row.isActive) } : undefined;
}

export async function grantAccess(nip: string, role: AccessRole): Promise<void> {
  const pool = await getPool(); const hris = quoteIdentifier(authConfig.hrisTable); const hrisNip = quoteIdentifier(authConfig.hrisNipColumn); const active = quoteIdentifier(authConfig.hrisActiveColumn);
  const employee = await pool.request().input('nip', sql.VarChar(50), nip).query(`SELECT TOP (1) 1 AS found FROM ${hris} WHERE ${hrisNip} = @nip AND ${active} IN ('1', 'Y', 'TRUE');`);
  if (!employee.recordset.length) throw Object.assign(new Error('Karyawan HRIS tidak aktif atau tidak ditemukan.'), { status: 400 });
  await pool.request().input('nip', sql.VarChar(50), nip).input('role', sql.VarChar(30), role).query(`MERGE ${accessTable()} AS target USING (SELECT @nip AS NIP, @role AS Role) AS source ON target.NIP = source.NIP WHEN MATCHED THEN UPDATE SET Role = source.Role, IsActive = 1, UpdatedAt = SYSDATETIME() WHEN NOT MATCHED THEN INSERT (NIP, Role, IsActive) VALUES (source.NIP, source.Role, 1);`);
}

export async function updateAccess(nip: string, input: { role?: AccessRole; isActive?: boolean }): Promise<void> {
  const fields: string[] = ['UpdatedAt = SYSDATETIME()']; const request = (await getPool()).request().input('nip', sql.VarChar(50), nip);
  if (input.role) { fields.push('Role = @role'); request.input('role', sql.VarChar(30), input.role); }
  if (typeof input.isActive === 'boolean') { fields.push('IsActive = @isActive'); request.input('isActive', sql.Bit, input.isActive); }
  await request.query(`UPDATE ${accessTable()} SET ${fields.join(', ')} WHERE NIP = @nip;`);
}
