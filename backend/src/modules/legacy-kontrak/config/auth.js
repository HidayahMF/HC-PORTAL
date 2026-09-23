"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authConfig = void 0;
exports.quoteIdentifier = quoteIdentifier;
exports.validateAuthConfig = validateAuthConfig;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: process.env.DOTENV_CONFIG_PATH ?? path_1.default.resolve(__dirname, '../../../.env') });
exports.authConfig = { jwtSecret: process.env.JWT_SECRET ?? '', jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN ?? 86400), cookieMaxAge: Number(process.env.COOKIE_MAX_AGE_MS ?? 86400000), cookieSecure: process.env.COOKIE_SECURE === 'true', cookieSameSite: (process.env.COOKIE_SAME_SITE ?? 'lax'), hrisTable: process.env.HRIS_EMPLOYEE_TABLE ?? 'dbo.hris_Employee', hrisNipColumn: process.env.HRIS_EMPLOYEE_NIP_COL ?? 'NIP', hrisNameColumn: process.env.HRIS_EMPLOYEE_NAME_COL ?? 'Name', hrisBirthDateColumn: process.env.HRIS_EMPLOYEE_BIRTHDATE_COL ?? 'BirthDate', hrisActiveColumn: process.env.HRIS_EMPLOYEE_ACTIVE_COL ?? 'is_Active', hrisDepartmentIdColumn: process.env.HRIS_EMPLOYEE_DEPARTMENT_ID_COL ?? 'DepartID', mascotCenterTable: process.env.MASCOSTCENTER_TABLE ?? 'dbo.MASCOSTCENTER', mascotCenterIdColumn: process.env.MASCOSTCENTER_ID_COL ?? 'DepartID', mascotCenterNameColumn: process.env.MASCOSTCENTER_NAME_COL ?? 'NamaDepartemen', activeValues: new Set((process.env.HRIS_ACTIVE_VALUES ?? '1,Y,true,TRUE').split(',').map(v => v.trim().toUpperCase())), accessTable: process.env.CONTRACT_AUTH_ACCESS_TABLE ?? 'dbo.ContractEmployeeAccess', rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000), rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 5) };
const identifier = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/;
function quoteIdentifier(value) { if (!identifier.test(value))
    throw new Error('Invalid identifier configuration.'); return value.split('.').map(part => `[${part}]`).join('.'); }
function validateAuthConfig() { if (exports.authConfig.jwtSecret.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters.'); if (!['lax', 'strict', 'none'].includes(exports.authConfig.cookieSameSite) || (exports.authConfig.cookieSameSite === 'none' && !exports.authConfig.cookieSecure))
    throw new Error('Invalid cookie configuration.'); quoteIdentifier(exports.authConfig.hrisTable); quoteIdentifier(exports.authConfig.hrisNipColumn); quoteIdentifier(exports.authConfig.hrisNameColumn); quoteIdentifier(exports.authConfig.hrisBirthDateColumn); quoteIdentifier(exports.authConfig.hrisActiveColumn); quoteIdentifier(exports.authConfig.hrisDepartmentIdColumn); quoteIdentifier(exports.authConfig.mascotCenterTable); quoteIdentifier(exports.authConfig.mascotCenterIdColumn); quoteIdentifier(exports.authConfig.mascotCenterNameColumn); quoteIdentifier(exports.authConfig.accessTable); }
