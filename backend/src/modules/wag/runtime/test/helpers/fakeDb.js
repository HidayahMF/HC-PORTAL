// Fake driver SQL Server untuk test — TIDAK ada koneksi nyata.
// Script: array handler { match: RegExp, result: (inputs) => recordset[] | {recordset} }
// Handler pertama yang match menang. request().input().query() mengikuti pola mssql.
"use strict";

const mssql = require("mssql");

function scriptedDb(script = []) {
  const request = () => {
    const inputs = [];
    const r = {
      input(name, _type, value) {
        inputs.push({ name, value });
        return r;
      },
      query(text) {
        for (const h of script) {
          if (h.match && h.match.test(text)) {
            if (typeof h.result === "function") {
              const res = h.result(inputs, text);
              if (res && res.recordset) return Promise.resolve(res);
              return Promise.resolve({ recordset: res || [], rowsAffected: [Array.isArray(res) ? res.length : 0] });
            }
            return Promise.resolve({ recordset: h.recordset || [], rowsAffected: [h.rowsAffected || (h.recordset ? h.recordset.length : 0)] });
          }
        }
        return Promise.resolve({ recordset: [], rowsAffected: [0] });
      },
      batch() {
        return Promise.resolve({ recordset: [] });
      },
    };
    return r;
  };

  return {
    poolPromise: Promise.resolve({ request }),
    sql: mssql,
  };
}

// Stub MySQL: getConnection/release + query mengembalikan [rows, fields].
function fakeMySqlPool({ rows = [], total = 0 } = {}) {
  const pool = {
    async getConnection() {
      return {
        release() {},
      };
    },
    async query(sqlText, params) {
      if (/COUNT\(\*\)/.test(sqlText)) return [{ total }, []];
      return [rows, []];
    },
    async end() {},
  };
  return Promise.resolve(pool);
}

module.exports = { scriptedDb, fakeMySqlPool };
