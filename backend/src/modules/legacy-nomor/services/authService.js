"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findActiveEmployee = findActiveEmployee;
exports.findActiveEmployeeByNip = findActiveEmployeeByNip;
exports.createToken = createToken;
exports.verifyToken = verifyToken;
const mssql_1 = __importDefault(require("mssql"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const auth_1 = require("../config/auth");
const userAccessService_1 = require("./userAccessService");
function normalizeNip(value) { return value.trim(); }
function normalizeBirthDate(value) { return value.trim(); }
function isValidBirthDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function isActive(value) { return auth_1.authConfig.activeValues.has(String(value ?? '').trim().toUpperCase()); }
function safeName(value) { return String(value ?? '').trim(); }
function userFromRow(row, role) { return { nip: String(row.nip).trim(), name: safeName(row.name), role, isActive: true }; }
async function configuredAccess(nip) {
    try {
        return await (0, userAccessService_1.getAccess)(nip);
    }
    catch (error) {
        if (error.number === 208 && auth_1.authConfig.allowedNips.has(nip))
            return { role: auth_1.authConfig.adminRole, isActive: true };
        throw error;
    }
}
function authQuery() { const table = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisTable); const nip = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn); const name = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn); const birth = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisBirthDateColumn); const active = (0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisActiveColumn); return `SELECT TOP (1) ${nip} AS nip, ${name} AS name, CONVERT(char(10), ${birth}, 23) AS birthDate, ${active} AS activeValue FROM ${table} WHERE ${nip} = @nip;`; }
async function findActiveEmployee(nipInput, birthDateInput) {
    const nip = normalizeNip(nipInput);
    const birthDate = normalizeBirthDate(birthDateInput);
    const pool = await (0, database_1.getPool)();
    if (!isValidBirthDate(birthDate))
        return undefined;
    const result = await pool.request().input('nip', mssql_1.default.VarChar(50), nip).query(authQuery());
    const row = result.recordset[0];
    if (!row || !isActive(row.activeValue))
        return undefined;
    const access = await configuredAccess(nip);
    if (!access?.isActive)
        return undefined;
    const dbBirthDate = String(row.birthDate ?? '').slice(0, 10);
    if (dbBirthDate !== birthDate)
        return undefined;
    return userFromRow(row, access.role);
}
async function findActiveEmployeeByNip(nip) { const normalized = normalizeNip(nip); const pool = await (0, database_1.getPool)(); const result = await pool.request().input('nip', mssql_1.default.VarChar(50), normalized).query(authQuery()); const row = result.recordset[0]; const access = await configuredAccess(normalized); if (!row || !isActive(row.activeValue) || !access?.isActive)
    return undefined; return userFromRow(row, access.role); }
function createToken(user) { return jsonwebtoken_1.default.sign({ nip: user.nip, role: user.role }, auth_1.authConfig.jwtSecret, { expiresIn: auth_1.authConfig.jwtExpiresIn }); }
function verifyToken(token) { return jsonwebtoken_1.default.verify(token, auth_1.authConfig.jwtSecret); }
