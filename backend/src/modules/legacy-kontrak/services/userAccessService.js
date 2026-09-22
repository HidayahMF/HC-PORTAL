"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccess = getAccess;
exports.listAccess = listAccess;
exports.searchActiveEmployees = searchActiveEmployees;
exports.grantAccess = grantAccess;
exports.updateAccess = updateAccess;
exports.removeAccess = removeAccess;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../config/database");
const auth_1 = require("../config/auth");
const access = () => (0, auth_1.quoteIdentifier)(auth_1.authConfig.accessTable);
const hris = () => (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisTable);
const active = () => (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisActiveColumn);
const nipCol = () => (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn);
const nameCol = () => (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn);
async function getAccess(nip) { const r = await (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip).query(`SELECT Role AS role,IsActive AS isActive FROM ${access()} WHERE NIP=@nip`); const x = r.recordset[0]; return x ? { role: String(x.role).toUpperCase(), isActive: Boolean(x.isActive) } : undefined; }
async function listAccess() { const r = await (await (0, database_1.getPool)()).request().query(`SELECT a.NIP AS nip,h.${nameCol()} AS name,a.Role AS role,a.IsActive AS isActive FROM ${access()} a LEFT JOIN ${hris()} h ON h.${nipCol()}=a.NIP ORDER BY h.${nameCol()}`); return r.recordset.map((x) => ({ nip: String(x.nip).trim(), name: String(x.name ?? '').trim(), role: String(x.role).toUpperCase(), isActive: Boolean(x.isActive) })); }
async function searchActiveEmployees(search = '') { const value = search.trim(); const r = await (await (0, database_1.getPool)()).request().input('search', mssql_1.default.NVarChar(100), value).input('likeSearch', mssql_1.default.NVarChar(110), `%${value}%`).query(`SELECT TOP (50) ${nipCol()} AS nip,${nameCol()} AS name FROM ${hris()} WHERE ${active()} IN ('1','Y','TRUE') AND (@search='' OR ${nipCol()} LIKE @likeSearch OR ${nameCol()} LIKE @likeSearch) ORDER BY ${nameCol()}`); return r.recordset.map((x) => ({ nip: String(x.nip).trim(), name: String(x.name ?? '').trim() })); }
async function grantAccess(nip, role) { const r = await (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip).query(`SELECT TOP (1) 1 AS found FROM ${hris()} WHERE ${nipCol()}=@nip AND ${active()} IN ('1','Y','TRUE')`); if (!r.recordset.length)
    throw Object.assign(new Error('Karyawan HRIS tidak aktif atau tidak ditemukan.'), { status: 400 }); await (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip).input('role', mssql_1.default.VarChar(30), role).query(`MERGE ${access()} AS t USING (SELECT @nip AS NIP,@role AS Role) AS s ON t.NIP=s.NIP WHEN MATCHED THEN UPDATE SET Role=s.Role,IsActive=1,UpdatedAt=SYSDATETIME() WHEN NOT MATCHED THEN INSERT(NIP,Role,IsActive) VALUES(s.NIP,s.Role,1);`); }
async function updateAccess(nip, input) { const fields = ['UpdatedAt=SYSDATETIME()']; const r = (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip); if (input.role) {
    fields.push('Role=@role');
    r.input('role', mssql_1.default.VarChar(30), input.role);
} if (typeof input.isActive === 'boolean') {
    fields.push('IsActive=@isActive');
    r.input('isActive', mssql_1.default.Bit, input.isActive);
} await r.query(`UPDATE ${access()} SET ${fields.join(',')} WHERE NIP=@nip`); }
async function removeAccess(nip) { await (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip).query(`DELETE FROM ${access()} WHERE NIP=@nip`); }
