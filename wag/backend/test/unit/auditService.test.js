"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { mockModule, clearModule } = require("../helpers/mockModule");

const DB_PATH = path.join(__dirname, "../../config/db.js");

test("logAudit: menyimpan action & target ke tabel audit_logs", async () => {
  const recorded = [];
  const fakeDb = {
    poolPromise: Promise.resolve({
      request: () => ({
        input(name, _type, value) {
          this[name] = value;
          return this;
        },
        query(sqlText) {
          assert.match(sqlText, /INSERT INTO audit_logs/);
          recorded.push({ ...this });
          return Promise.resolve({ recordset: [] });
        },
      }),
    }),
    sql: require("mssql"),
  };
  mockModule(DB_PATH, fakeDb);
  const { logAudit } = require("../../services/auditService");

  await logAudit({ nip: "0001", action: "broadcast.created", target: "job:1", meta: { total: 3 } });

  assert.strictEqual(recorded.length, 1);
  assert.strictEqual(recorded[0].action, "broadcast.created");
  assert.strictEqual(recorded[0].nip, "0001");
  assert.ok(typeof recorded[0].meta === "string"); // JSON string
  clearModule(DB_PATH);
});

test("logAudit: error DB tidak melempar (ditelan & di-log)", async () => {
  const fakeDb = {
    poolPromise: Promise.resolve({
      request: () => ({
        input() { return this; },
        query() { return Promise.reject(new Error("db down")); },
      }),
    }),
    sql: require("mssql"),
  };
  mockModule(DB_PATH, fakeDb);
  const { logAudit } = require("../../services/auditService");

  await logAudit({ nip: "0001", action: "auth.login_success", target: "nip:0001" }); // tidak boleh throw
  assert.ok(true);
  clearModule(DB_PATH);
});
