"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchActiveEmployees = searchActiveEmployees;
exports.listAccess = listAccess;
exports.getAccess = getAccess;
exports.grantAccess = grantAccess;
exports.updateAccess = updateAccess;
exports.deleteAccess = deleteAccess;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../config/database");
const auth_1 = require("../config/auth");
const accessTable = () => (0, auth_1.quoteIdentifier)(auth_1.authConfig.accessTable);
async function searchActiveEmployees(search = '') {
    const pool = await (0, database_1.getPool)();
    const value = search.trim();
    const table = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisTable);
    const nip = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn);
    const name = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn);
    const active = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisActiveColumn);
    const result = await pool.request().input('search', mssql_1.default.NVarChar(100), value).input('likeSearch', mssql_1.default.NVarChar(110), `%${value}%`).query(`SELECT TOP (100) ${nip} AS nip, ${name} AS name FROM ${table} WHERE ${active} IN ('1', 'Y', 'TRUE') AND (@search = '' OR ${nip} LIKE @likeSearch OR ${name} LIKE @likeSearch) ORDER BY ${name};`);
    return result.recordset.map((row) => ({ nip: String(row.nip).trim(), name: String(row.name ?? '').trim() }));
}
async function listAccess() {
    const pool = await (0, database_1.getPool)();
    const hris = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisTable);
    const nip = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn);
    const name = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn);
    const result = await pool.request().query(`SELECT a.NIP AS nip, h.${name} AS name, a.Role AS role, a.IsActive AS isActive FROM ${accessTable()} a INNER JOIN ${hris} h ON h.${nip} = a.NIP ORDER BY h.${name};`);
    return result.recordset.map((row) => ({ nip: String(row.nip).trim(), name: String(row.name ?? '').trim(), role: String(row.role).toUpperCase(), isActive: Boolean(row.isActive) }));
}
async function getAccess(nip) {
    const result = await (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip).query(`SELECT Role AS role, IsActive AS isActive FROM ${accessTable()} WHERE NIP = @nip;`);
    const row = result.recordset[0];
    return row ? { role: String(row.role).toUpperCase(), isActive: Boolean(row.isActive) } : undefined;
}
async function grantAccess(nip, role) {
    const pool = await (0, database_1.getPool)();
    const hris = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisTable);
    const hrisNip = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn);
    const active = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisActiveColumn);
    const employee = await pool.request().input('nip', mssql_1.default.VarChar(50), nip).query(`SELECT TOP (1) 1 AS found FROM ${hris} WHERE ${hrisNip} = @nip AND ${active} IN ('1', 'Y', 'TRUE');`);
    if (!employee.recordset.length)
        throw Object.assign(new Error('Karyawan HRIS tidak aktif atau tidak ditemukan.'), { status: 400 });
    await pool.request().input('nip', mssql_1.default.VarChar(50), nip).input('role', mssql_1.default.VarChar(30), role).query(`MERGE ${accessTable()} AS target USING (SELECT @nip AS NIP, @role AS Role) AS source ON target.NIP = source.NIP WHEN MATCHED THEN UPDATE SET Role = source.Role, IsActive = 1, UpdatedAt = SYSDATETIME() WHEN NOT MATCHED THEN INSERT (NIP, Role, IsActive) VALUES (source.NIP, source.Role, 1);`);
}
async function updateAccess(nip, input) {
    const fields = ['UpdatedAt = SYSDATETIME()'];
    const request = (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip);
    if (input.role) {
        fields.push('Role = @role');
        request.input('role', mssql_1.default.VarChar(30), input.role);
    }
    if (typeof input.isActive === 'boolean') {
        fields.push('IsActive = @isActive');
        request.input('isActive', mssql_1.default.Bit, input.isActive);
    }
    await request.query(`UPDATE ${accessTable()} SET ${fields.join(', ')} WHERE NIP = @nip;`);
}
async function deleteAccess(nip) {
    const result = await (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip).query(`DELETE FROM ${accessTable()} WHERE NIP = @nip;`);
    return (result.rowsAffected[0] ?? 0) > 0;
}
