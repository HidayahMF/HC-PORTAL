"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
function audit(event, details = {}) { const safe = Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined)); console.info(JSON.stringify({ event, at: new Date().toISOString(), ...safe })); }
