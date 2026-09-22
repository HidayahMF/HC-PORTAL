"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchEmployees = searchEmployees;
exports.employeeByNip = employeeByNip;
exports.activeEmployee = activeEmployee;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../config/database");
const auth_1 = require("../config/auth");
const departmentJoin = `LEFT JOIN ${(0, auth_1.quoteIdentifier)(auth_1.authConfig.mascotCenterTable)} d ON e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisDepartmentIdColumn)}=d.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.mascotCenterIdColumn)}`;
async function searchEmployees(search = '') { const value = search.trim(); const r = await (await (0, database_1.getPool)()).request().input('search', mssql_1.default.NVarChar(100), value).input('likeSearch', mssql_1.default.NVarChar(110), `%${value}%`).query(`SELECT TOP (50) e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn)} AS nip,e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn)} AS name,d.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.mascotCenterNameColumn)} AS department FROM ${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisTable)} e ${departmentJoin} WHERE e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisActiveColumn)} IN ('1','Y','TRUE') AND (@search='' OR e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn)} LIKE @likeSearch OR e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn)} LIKE @likeSearch) ORDER BY e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn)}`); return r.recordset.map((x) => ({ nip: String(x.nip).trim(), name: String(x.name ?? '').trim(), department: x.department ? String(x.department).trim() : undefined })); }
async function employeeByNip(nip, activeOnly = true) { const activeFilter = activeOnly ? ` AND e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisActiveColumn)} IN ('1','Y','TRUE')` : ''; const r = await (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip).query(`SELECT TOP (1) e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn)} AS name,d.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.mascotCenterNameColumn)} AS department FROM ${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisTable)} e ${departmentJoin} WHERE e.${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn)}=@nip${activeFilter}`); return r.recordset[0]; }
async function activeEmployee(nip) { return employeeByNip(nip, true); }
