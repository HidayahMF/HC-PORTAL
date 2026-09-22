"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.departments = departments;
exports.createLetter = createLetter;
exports.listLetters = listLetters;
exports.getLetter = getLetter;
exports.deleteLetter = deleteLetter;
exports.summary = summary;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../config/database");
const auth_1 = require("../config/auth");
function formatMonthYear(date) { const months = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']; return `${months[date.getMonth()]}/${date.getFullYear()}`; }
function isoDate(date) { return date.toISOString().slice(0, 10); }
function mapLetter(row) { return { id: row.Id, letterNumber: row.LetterNumber, sequenceNumber: row.SequenceNumber, department: row.DepartmentName, type: row.LetterType, subject: row.Subject, letterDate: row.LetterDate instanceof Date ? isoDate(row.LetterDate) : String(row.LetterDate).slice(0, 10), createdAt: String(row.CreatedAt) }; }
async function departments() { const pool = await (0, database_1.getPool)(); const result = await pool.request().query('SELECT NamaDepartemen FROM MASCOSTCENTER WHERE LevelDepartemen = \'Departemen\' ORDER BY NamaDepartemen;'); return result.recordset.map((r) => r.NamaDepartemen); }
async function createLetter(input) {
    const pool = await (0, database_1.getPool)();
    const transaction = new mssql_1.default.Transaction(pool);
    await transaction.begin(mssql_1.default.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const request = new mssql_1.default.Request(transaction);
        const dep = await request.input('department', mssql_1.default.NVarChar(150), input.department).query("SELECT NamaDepartemen FROM MASCOSTCENTER WHERE LevelDepartemen = 'Departemen' AND NamaDepartemen = @department;");
        if (!dep.recordset.length)
            throw Object.assign(new Error('Department does not exist.'), { status: 400 });
        const current = await new mssql_1.default.Request(transaction).input('firstSequence', mssql_1.default.Int, 1).input('legacyYear', mssql_1.default.Int, auth_1.authConfig.sequenceLegacyYear).input('legacyStart', mssql_1.default.Int, auth_1.authConfig.sequenceLegacyStart).query("WITH CurrentYearNumbers AS (SELECT CASE WHEN SequenceNumber > TRY_CONVERT(INT, LEFT(LetterNumber, CHARINDEX('/', LetterNumber + '/') - 1)) THEN SequenceNumber ELSE TRY_CONVERT(INT, LEFT(LetterNumber, CHARINDEX('/', LetterNumber + '/') - 1)) END AS SequenceValue FROM LetterNumbers WITH (UPDLOCK, HOLDLOCK) WHERE YEAR(LetterDate) = YEAR(GETDATE()) OR LetterNumber LIKE '%/' + CONVERT(varchar(4), YEAR(GETDATE())) + '/'), CurrentMaximum AS (SELECT MAX(SequenceValue) AS MaximumSequence FROM CurrentYearNumbers) SELECT CASE WHEN YEAR(GETDATE()) = @legacyYear AND ISNULL(MaximumSequence, @firstSequence - 1) < @legacyStart THEN @legacyStart WHEN ISNULL(MaximumSequence, @firstSequence - 1) < @firstSequence THEN @firstSequence ELSE MaximumSequence + 1 END AS NextSequence, CAST(GETDATE() AS DATE) AS ServerDate FROM CurrentMaximum;");
        const sequence = current.recordset[0].NextSequence;
        const serverDate = current.recordset[0].ServerDate;
        const letterDate = isoDate(serverDate);
        const letterNumber = `${String(sequence).padStart(3, '0')}/${input.department}/${formatMonthYear(serverDate)}/`;
        const inserted = await new mssql_1.default.Request(transaction).input('number', mssql_1.default.NVarChar(300), letterNumber).input('sequence', mssql_1.default.Int, sequence).input('department', mssql_1.default.NVarChar(150), input.department).input('type', mssql_1.default.VarChar(10), input.type).input('subject', mssql_1.default.NVarChar(500), input.subject).input('date', mssql_1.default.Date, letterDate).query('INSERT INTO LetterNumbers (LetterNumber, SequenceNumber, DepartmentName, LetterType, Subject, LetterDate) OUTPUT INSERTED.* VALUES (@number, @sequence, @department, @type, @subject, @date);');
        await transaction.commit();
        return mapLetter(inserted.recordset[0]);
    }
    catch (error) {
        await transaction.rollback().catch(() => undefined);
        throw error;
    }
}
async function listLetters(query) {
    const pool = await (0, database_1.getPool)();
    const request = pool.request();
    const where = ['1=1'];
    if (query.search) {
        where.push('(LetterNumber LIKE @search OR Subject LIKE @search)');
        request.input('search', mssql_1.default.NVarChar(500), `%${query.search}%`);
    }
    if (query.department) {
        where.push('DepartmentName = @department');
        request.input('department', mssql_1.default.NVarChar(150), query.department);
    }
    if (query.type) {
        where.push('LetterType = @type');
        request.input('type', mssql_1.default.VarChar(10), query.type);
    }
    if (query.startDate) {
        where.push('LetterDate >= @startDate');
        request.input('startDate', mssql_1.default.Date, query.startDate);
    }
    if (query.endDate) {
        where.push('LetterDate <= @endDate');
        request.input('endDate', mssql_1.default.Date, query.endDate);
    }
    const clause = where.join(' AND ');
    const offset = (query.page - 1) * query.limit;
    request.input('offset', mssql_1.default.Int, offset).input('limit', mssql_1.default.Int, query.limit);
    const result = await request.query(`SELECT *, COUNT(*) OVER() AS TotalCount FROM LetterNumbers WHERE ${clause} ORDER BY CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;`);
    const total = result.recordset[0]?.TotalCount ?? 0;
    return { items: result.recordset.map(mapLetter), page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
}
async function getLetter(id) { const pool = await (0, database_1.getPool)(); const r = await pool.request().input('id', mssql_1.default.Int, id).query('SELECT * FROM LetterNumbers WHERE Id = @id;'); return r.recordset[0] ? mapLetter(r.recordset[0]) : undefined; }
async function deleteLetter(id) { const pool = await (0, database_1.getPool)(); const result = await pool.request().input('id', mssql_1.default.Int, id).query('DELETE FROM LetterNumbers WHERE Id = @id;'); return (result.rowsAffected[0] ?? 0) > 0; }
async function summary() { const pool = await (0, database_1.getPool)(); const r = await pool.request().query("SELECT COUNT(*) AS total, SUM(CASE WHEN LetterType = 'INTERNAL' THEN 1 ELSE 0 END) AS internalCount, SUM(CASE WHEN LetterType = 'EXTERNAL' THEN 1 ELSE 0 END) AS externalCount, SUM(CASE WHEN LetterDate = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS todayCount FROM LetterNumbers;"); const row = r.recordset[0]; return { total: row.total, internal: row.internalCount ?? 0, external: row.externalCount ?? 0, today: row.todayCount ?? 0 }; }
