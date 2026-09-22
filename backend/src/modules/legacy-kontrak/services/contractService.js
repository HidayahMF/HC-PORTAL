"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.nextContractNumber = nextContractNumber;
exports.get = get;
exports.contractNumbers = contractNumbers;
exports.list = list;
exports.summary = summary;
exports.update = update;
exports.remove = remove;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../config/database");
const auth_1 = require("../config/auth");
const employeeService_1 = require("./employeeService");
const status = (start, end) => { if (!start || !end)
    return { status: 'Data belum lengkap', remainingDays: 0 }; const t = new Date(); t.setHours(0, 0, 0, 0); const s = new Date(`${start}T00:00:00`), e = new Date(`${end}T00:00:00`); const days = Math.ceil((e.getTime() - t.getTime()) / 86400000); return { status: t < s ? 'Belum Dimulai' : t > e ? 'Berakhir' : days <= 30 ? 'Segera Berakhir' : 'Aktif', remainingDays: days }; };
const dateOnly = (value) => value == null ? '' : value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
function map(x) { const startDate = dateOnly(x.startDate), endDate = dateOnly(x.endDate), dates = status(startDate, endDate); return { id: Number(x.id), nip: String(x.nip).trim(), employeeName: String(x.employeeName), department: x.department ? String(x.department).trim() : undefined, contractNumber: x.contractNumber ? String(x.contractNumber).trim() : undefined, startDate, endDate, createdByNip: String(x.createdByNip), createdByName: String(x.createdByName ?? x.createdByNip), updatedByNip: x.updatedByNip ? String(x.updatedByNip) : undefined, createdAt: new Date(x.createdAt).toISOString(), updatedAt: new Date(x.updatedAt).toISOString(), ...dates }; }
const table = 'dbo.EmployeeContracts';
const base = `SELECT c.Id AS id,c.NIP AS nip,c.EmployeeNameSnapshot AS employeeName,c.DepartmentSnapshot AS department,c.ContractNumber AS contractNumber,c.ContractStartDate AS startDate,c.ContractEndDate AS endDate,c.CreatedByNIP AS createdByNip,cr.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn)} AS createdByName,c.UpdatedByNIP AS updatedByNip,c.CreatedAt AS createdAt,c.UpdatedAt AS updatedAt FROM ${table} c LEFT JOIN ${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisTable)} cr ON cr.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn)}=c.CreatedByNIP`;
function validDate(v) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v))
    return false; const [year, month, day] = v.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day; }
async function create(input, by, options) { if (!validDate(input.startDate) || !validDate(input.endDate) || input.endDate < input.startDate)
    throw Object.assign(new Error('Tanggal kontrak tidak valid.'), { status: 400 }); const employee = await (0, employeeService_1.employeeByNip)(input.nip, !options?.allowInactive); if (!employee && !options?.allowMissingHris)
    throw Object.assign(new Error(options?.allowInactive ? 'Karyawan tidak ditemukan di HRIS.' : 'Karyawan aktif tidak ditemukan.'), { status: 400 }); const name = employee?.name || input.employeeName?.trim() || `NIP ${input.nip}`; const department = employee?.department || null; const pool = await (0, database_1.getPool)(); const transaction = new mssql_1.default.Transaction(pool); await transaction.begin(); try {
    const sequence = (await new mssql_1.default.Request(transaction).query(`SELECT MAX(TRY_CONVERT(INT,LEFT(ContractNumber,CHARINDEX('/',ContractNumber+'/')-1))) AS lastNumber,MAX(LEN(LEFT(ContractNumber,CHARINDEX('/',ContractNumber+'/')-1))) AS numberWidth FROM ${table} WITH (UPDLOCK,HOLDLOCK) WHERE TRY_CONVERT(INT,LEFT(ContractNumber,CHARINDEX('/',ContractNumber+'/')-1)) IS NOT NULL`)).recordset[0];
    const nextNumber = Number(sequence.lastNumber ?? 0) + 1;
    const width = Math.max(3, Number(sequence.numberWidth ?? 3));
    const numberText = String(nextNumber).padStart(width, '0');
    const month = Number(input.startDate.slice(5, 7));
    const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][month];
    const contractNumber = `${numberText}/HC/BMC/${roman}/${input.startDate.slice(0, 4)}`;
    const duplicate = await new mssql_1.default.Request(transaction).input('nip', mssql_1.default.VarChar(50), input.nip).input('start', mssql_1.default.Date, input.startDate).input('end', mssql_1.default.Date, input.endDate).input('contractNumber', mssql_1.default.VarChar(100), contractNumber).query(`SELECT TOP (1) Id FROM ${table} WHERE NIP=@nip AND ContractStartDate=@start AND ContractEndDate=@end AND ContractNumber=@contractNumber`);
    if (duplicate.recordset.length)
        throw Object.assign(new Error('Kontrak yang sama sudah ada.'), { code: 'DUPLICATE', status: 409 });
    const r = await new mssql_1.default.Request(transaction).input('nip', mssql_1.default.VarChar(50), input.nip).input('name', mssql_1.default.NVarChar(200), name).input('department', mssql_1.default.NVarChar(200), department).input('contractNumber', mssql_1.default.VarChar(100), contractNumber).input('start', mssql_1.default.Date, input.startDate).input('end', mssql_1.default.Date, input.endDate).input('by', mssql_1.default.VarChar(50), by).query(`INSERT INTO ${table}(NIP,EmployeeNameSnapshot,DepartmentSnapshot,ContractNumber,ContractStartDate,ContractEndDate,CreatedByNIP) OUTPUT INSERTED.Id VALUES(@nip,@name,@department,@contractNumber,@start,@end,@by)`);
    await transaction.commit();
    return get(Number(r.recordset[0].Id));
}
catch (error) {
    await transaction.rollback();
    throw error;
} }
async function nextContractNumber(startDate) { if (!validDate(startDate))
    return ''; const row = (await (0, database_1.getPool)()).request(); const result = (await row.query(`SELECT MAX(TRY_CONVERT(INT,LEFT(ContractNumber,CHARINDEX('/',ContractNumber+'/')-1))) AS lastNumber,MAX(LEN(LEFT(ContractNumber,CHARINDEX('/',ContractNumber+'/')-1))) AS numberWidth FROM ${table} WITH (NOLOCK) WHERE TRY_CONVERT(INT,LEFT(ContractNumber,CHARINDEX('/',ContractNumber+'/')-1)) IS NOT NULL`)).recordset[0]; const next = Number(result.lastNumber ?? 0) + 1; const width = Math.max(3, Number(result.numberWidth ?? 3)); const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][Number(startDate.slice(5, 7))]; return `${String(next).padStart(width, '0')}/HC/BMC/${roman}/${startDate.slice(0, 4)}`; }
async function get(id) { const r = await (await (0, database_1.getPool)()).request().input('id', mssql_1.default.BigInt, id).query(`${base} WHERE c.Id=@id`); return r.recordset[0] ? map(r.recordset[0]) : undefined; }
async function contractNumbers() { const r = await (await (0, database_1.getPool)()).query(`SELECT DISTINCT LTRIM(RTRIM(ContractNumber)) AS contractNumber,TRY_CONVERT(INT,LEFT(LTRIM(RTRIM(ContractNumber)),CHARINDEX('/',LTRIM(RTRIM(ContractNumber))+'/')-1)) AS contractSequence FROM ${table} WHERE NULLIF(LTRIM(RTRIM(ContractNumber)),'') IS NOT NULL ORDER BY contractSequence DESC,LTRIM(RTRIM(ContractNumber)) DESC`); return r.recordset.map(x => String(x.contractNumber)); }
async function list(input) { const where = ['1=1']; const r = (await (0, database_1.getPool)()).request().input('search', mssql_1.default.NVarChar(100), input.search.trim()).input('likeSearch', mssql_1.default.NVarChar(110), `%${input.search.trim()}%`); if (input.department) {
    where.push('ISNULL(c.DepartmentSnapshot,\'-\')=@department');
    r.input('department', mssql_1.default.NVarChar(200), input.department);
} if (input.contractNumber) {
    where.push('LTRIM(RTRIM(c.ContractNumber))=@contractNumber');
    r.input('contractNumber', mssql_1.default.VarChar(100), input.contractNumber.trim());
} if (input.startDate) {
    where.push('c.ContractStartDate>=@filterStart');
    r.input('filterStart', mssql_1.default.Date, input.startDate);
} if (input.endDate) {
    where.push('c.ContractEndDate<=@filterEnd');
    r.input('filterEnd', mssql_1.default.Date, input.endDate);
} if (input.search)
    where.push('(c.NIP LIKE @likeSearch OR c.EmployeeNameSnapshot LIKE @likeSearch OR c.ContractNumber LIKE @likeSearch)'); if (input.status === 'Data belum lengkap')
    where.push('(c.ContractStartDate IS NULL OR c.ContractEndDate IS NULL)'); if (input.status === 'Belum Dimulai')
    where.push('c.ContractStartDate IS NOT NULL AND c.ContractEndDate IS NOT NULL AND c.ContractStartDate>CAST(GETDATE() AS date)'); if (input.status === 'Berakhir')
    where.push('c.ContractStartDate IS NOT NULL AND c.ContractEndDate IS NOT NULL AND c.ContractEndDate<CAST(GETDATE() AS date)'); if (input.status === 'Segera Berakhir')
    where.push('c.ContractStartDate IS NOT NULL AND c.ContractEndDate IS NOT NULL AND c.ContractStartDate<=CAST(GETDATE() AS date) AND c.ContractEndDate>=CAST(GETDATE() AS date) AND c.ContractEndDate<=DATEADD(day,30,CAST(GETDATE() AS date))'); if (input.status === 'Aktif')
    where.push('c.ContractStartDate IS NOT NULL AND c.ContractEndDate IS NOT NULL AND c.ContractStartDate<=CAST(GETDATE() AS date) AND c.ContractEndDate>DATEADD(day,30,CAST(GETDATE() AS date))'); const count = await r.query(`SELECT COUNT(*) AS total FROM ${table} c WHERE ${where.join(' AND ')}`); const total = Number(count.recordset[0].total), offset = (input.page - 1) * input.limit; const rows = await r.input('offset', mssql_1.default.Int, offset).input('limit', mssql_1.default.Int, input.limit).query(`${base} WHERE ${where.join(' AND ')} ORDER BY TRY_CONVERT(INT,LEFT(LTRIM(RTRIM(c.ContractNumber)),CHARINDEX('/',LTRIM(RTRIM(c.ContractNumber))+'/')-1)) DESC,c.ContractEndDate DESC,c.Id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`); return { items: rows.recordset.map(map), page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) }; }
async function summary() { const r = await (await (0, database_1.getPool)()).query(`SELECT COUNT(*) AS total,SUM(CASE WHEN ContractStartDate<=CAST(GETDATE() AS date) AND ContractEndDate>DATEADD(day,30,CAST(GETDATE() AS date)) THEN 1 ELSE 0 END) AS active,SUM(CASE WHEN ContractStartDate<=CAST(GETDATE() AS date) AND ContractEndDate>=CAST(GETDATE() AS date) AND ContractEndDate<=DATEADD(day,30,CAST(GETDATE() AS date)) THEN 1 ELSE 0 END) AS expiring,SUM(CASE WHEN ContractEndDate<CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS expired FROM ${table}`); const x = r.recordset[0]; return { total: Number(x.total), active: Number(x.active ?? 0), expiring: Number(x.expiring ?? 0), expired: Number(x.expired ?? 0) }; }
async function update(id, input, by) { if (!validDate(input.startDate) || !validDate(input.endDate) || input.endDate < input.startDate)
    throw Object.assign(new Error('Tanggal kontrak tidak valid.'), { status: 400 }); const e = await (0, employeeService_1.activeEmployee)(input.nip); if (!e)
    throw Object.assign(new Error('Karyawan aktif tidak ditemukan.'), { status: 400 }); const r = await (await (0, database_1.getPool)()).request().input('id', mssql_1.default.BigInt, id).input('nip', mssql_1.default.VarChar(50), input.nip).input('name', mssql_1.default.NVarChar(200), e.name).input('department', mssql_1.default.NVarChar(200), e.department || null).input('start', mssql_1.default.Date, input.startDate).input('end', mssql_1.default.Date, input.endDate).input('by', mssql_1.default.VarChar(50), by).query(`UPDATE ${table} SET NIP=@nip,EmployeeNameSnapshot=@name,DepartmentSnapshot=@department,ContractStartDate=@start,ContractEndDate=@end,UpdatedByNIP=@by,UpdatedAt=SYSDATETIME() WHERE Id=@id`); if (!r.rowsAffected[0])
    return; return get(id); }
async function remove(id) { const r = await (await (0, database_1.getPool)()).request().input('id', mssql_1.default.BigInt, id).query(`DELETE FROM ${table} WHERE Id=@id`); return Boolean(r.rowsAffected[0]); }
