"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.createToken = void 0;
exports.findActiveEmployee = findActiveEmployee;
exports.findActiveEmployeeByNip = findActiveEmployeeByNip;
const mssql_1 = __importDefault(require("mssql"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const auth_1 = require("../config/auth");
const userAccessService_1 = require("./userAccessService");
const active = (v) => auth_1.authConfig.activeValues.has(String(v ?? '').trim().toUpperCase());
function validBirthCode(code) { if (!/^\d{6}$|^\d{8}$/.test(code))
    return false; const day = Number(code.slice(0, 2)), month = Number(code.slice(2, 4)), year = code.length === 8 ? Number(code.slice(4)) : 2000 + Number(code.slice(4)); const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day; }
function query(where) { return `SELECT TOP (1) ${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn)} AS nip,${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNameColumn)} AS name,${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisActiveColumn)} AS activeValue FROM ${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisTable)} WHERE ${where}`; }
async function employee(nip) { const r = await (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip).query(query(`${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn)}=@nip`)); return r.recordset[0]; }
async function findActiveEmployee(nip, code) { if (!validBirthCode(code))
    return; const year = code.length === 6 ? `20${code.slice(4)}` : code.slice(4); const birthDateSql = `${year}${code.slice(2, 4)}${code.slice(0, 2)}`; const r = await (await (0, database_1.getPool)()).request().input('nip', mssql_1.default.VarChar(50), nip).input('birthDate', mssql_1.default.Char(8), birthDateSql).query(query(`${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisNipColumn)}=@nip AND CONVERT(char(8),${(0, auth_1.quoteIdentifier)(auth_1.authConfig.hrisBirthDateColumn)},112)=@birthDate`)); const row = r.recordset[0]; const access = await (0, userAccessService_1.getAccess)(nip); if (!row || !active(row.activeValue) || !access?.isActive)
    return; return { nip: String(row.nip).trim(), name: String(row.name ?? '').trim(), role: access.role, isActive: true }; }
async function findActiveEmployeeByNip(nip) { const row = await employee(nip); const access = await (0, userAccessService_1.getAccess)(nip); if (!row || !active(row.activeValue) || !access?.isActive)
    return; return { nip: String(row.nip).trim(), name: String(row.name ?? '').trim(), role: access.role, isActive: true }; }
const createToken = (user) => jsonwebtoken_1.default.sign({ nip: user.nip, role: user.role }, auth_1.authConfig.jwtSecret, { expiresIn: auth_1.authConfig.jwtExpiresIn });
exports.createToken = createToken;
const verifyToken = (token) => jsonwebtoken_1.default.verify(token, auth_1.authConfig.jwtSecret);
exports.verifyToken = verifyToken;
