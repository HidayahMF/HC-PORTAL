import sql from 'mssql';
import { getPool } from '../config/database';
import { Letter, LetterType, Page } from '../types/models';
import { authConfig } from '../config/auth';

function formatMonthYear(date: Date): string { const months = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']; return `${months[date.getMonth()]}/${date.getFullYear()}`; }
function isoDate(date: Date): string { return date.toISOString().slice(0, 10); }
function mapLetter(row: Record<string, unknown>): Letter { return { id: row.Id as number, letterNumber: row.LetterNumber as string, sequenceNumber: row.SequenceNumber as number, department: row.DepartmentName as string, type: row.LetterType as LetterType, subject: row.Subject as string, letterDate: row.LetterDate instanceof Date ? isoDate(row.LetterDate) : String(row.LetterDate).slice(0, 10), createdAt: String(row.CreatedAt) }; }

export async function departments(): Promise<string[]> { const pool = await getPool(); const result = await pool.request().query('SELECT NamaDepartemen FROM MASCOSTCENTER WHERE LevelDepartemen = \'Departemen\' ORDER BY NamaDepartemen;'); return result.recordset.map((r: { NamaDepartemen: string }) => r.NamaDepartemen); }

export async function createLetter(input: { department: string; type: LetterType; subject: string }): Promise<Letter> {
  const pool = await getPool(); const transaction = new sql.Transaction(pool); await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const request = new sql.Request(transaction);
    const dep = await request.input('department', sql.NVarChar(150), input.department).query("SELECT NamaDepartemen FROM MASCOSTCENTER WHERE LevelDepartemen = 'Departemen' AND NamaDepartemen = @department;");
    if (!dep.recordset.length) throw Object.assign(new Error('Department does not exist.'), { status: 400 });
    const current = await new sql.Request(transaction).input('firstSequence', sql.Int, 1).input('legacyYear', sql.Int, authConfig.sequenceLegacyYear).input('legacyStart', sql.Int, authConfig.sequenceLegacyStart).query("WITH CurrentYearNumbers AS (SELECT CASE WHEN SequenceNumber > TRY_CONVERT(INT, LEFT(LetterNumber, CHARINDEX('/', LetterNumber + '/') - 1)) THEN SequenceNumber ELSE TRY_CONVERT(INT, LEFT(LetterNumber, CHARINDEX('/', LetterNumber + '/') - 1)) END AS SequenceValue FROM LetterNumbers WITH (UPDLOCK, HOLDLOCK) WHERE YEAR(LetterDate) = YEAR(GETDATE()) OR LetterNumber LIKE '%/' + CONVERT(varchar(4), YEAR(GETDATE())) + '/'), CurrentMaximum AS (SELECT MAX(SequenceValue) AS MaximumSequence FROM CurrentYearNumbers) SELECT CASE WHEN YEAR(GETDATE()) = @legacyYear AND ISNULL(MaximumSequence, @firstSequence - 1) < @legacyStart THEN @legacyStart WHEN ISNULL(MaximumSequence, @firstSequence - 1) < @firstSequence THEN @firstSequence ELSE MaximumSequence + 1 END AS NextSequence, CAST(GETDATE() AS DATE) AS ServerDate FROM CurrentMaximum;");
    const sequence = current.recordset[0].NextSequence as number; const serverDate = current.recordset[0].ServerDate as Date; const letterDate = isoDate(serverDate); const letterNumber = `${String(sequence).padStart(3, '0')}/${input.department}/${formatMonthYear(serverDate)}/`;
    const inserted = await new sql.Request(transaction).input('number', sql.NVarChar(300), letterNumber).input('sequence', sql.Int, sequence).input('department', sql.NVarChar(150), input.department).input('type', sql.VarChar(10), input.type).input('subject', sql.NVarChar(500), input.subject).input('date', sql.Date, letterDate).query('INSERT INTO LetterNumbers (LetterNumber, SequenceNumber, DepartmentName, LetterType, Subject, LetterDate) OUTPUT INSERTED.* VALUES (@number, @sequence, @department, @type, @subject, @date);');
    await transaction.commit(); return mapLetter(inserted.recordset[0]);
  } catch (error) { await transaction.rollback().catch(() => undefined); throw error; }
}

export async function listLetters(query: { page: number; limit: number; search?: string; department?: string; type?: LetterType; startDate?: string; endDate?: string }): Promise<Page<Letter>> {
  const pool = await getPool(); const request = pool.request(); const where: string[] = ['1=1'];
  if (query.search) { where.push('(LetterNumber LIKE @search OR Subject LIKE @search)'); request.input('search', sql.NVarChar(500), `%${query.search}%`); }
  if (query.department) { where.push('DepartmentName = @department'); request.input('department', sql.NVarChar(150), query.department); }
  if (query.type) { where.push('LetterType = @type'); request.input('type', sql.VarChar(10), query.type); }
  if (query.startDate) { where.push('LetterDate >= @startDate'); request.input('startDate', sql.Date, query.startDate); }
  if (query.endDate) { where.push('LetterDate <= @endDate'); request.input('endDate', sql.Date, query.endDate); }
  const clause = where.join(' AND '); const offset = (query.page - 1) * query.limit; request.input('offset', sql.Int, offset).input('limit', sql.Int, query.limit);
  const result = await request.query(`SELECT *, COUNT(*) OVER() AS TotalCount FROM LetterNumbers WHERE ${clause} ORDER BY CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;`); const total = result.recordset[0]?.TotalCount ?? 0;
  return { items: result.recordset.map(mapLetter), page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
}
export async function getLetter(id: number): Promise<Letter | undefined> { const pool = await getPool(); const r = await pool.request().input('id', sql.Int, id).query('SELECT * FROM LetterNumbers WHERE Id = @id;'); return r.recordset[0] ? mapLetter(r.recordset[0]) : undefined; }
export async function deleteLetter(id: number): Promise<boolean> { const pool = await getPool(); const result = await pool.request().input('id', sql.Int, id).query('DELETE FROM LetterNumbers WHERE Id = @id;'); return (result.rowsAffected[0] ?? 0) > 0; }
export async function summary() { const pool = await getPool(); const r = await pool.request().query("SELECT COUNT(*) AS total, SUM(CASE WHEN LetterType = 'INTERNAL' THEN 1 ELSE 0 END) AS internalCount, SUM(CASE WHEN LetterType = 'EXTERNAL' THEN 1 ELSE 0 END) AS externalCount, SUM(CASE WHEN LetterDate = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS todayCount FROM LetterNumbers;"); const row = r.recordset[0]; return { total: row.total, internal: row.internalCount ?? 0, external: row.externalCount ?? 0, today: row.todayCount ?? 0 }; }
