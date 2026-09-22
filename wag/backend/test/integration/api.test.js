"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { mockModule, clearModule } = require("../helpers/mockModule");
const { scriptedDb, fakeMySqlPool } = require("../helpers/fakeDb");

// --- Env WAJIB disetel SEBELUM require server.js (validateEnv fail-fast) ---
process.env.NODE_ENV = "test";
process.env.DB_SERVER = "test-server";
process.env.DB_DATABASE = "BMC";
process.env.DB_USER = "test-user";
process.env.DB_PASSWORD = "test-password";
process.env.JWT_SECRET = "integration-test-secret-0123456789abcdef";
process.env.ALLOWED_NIPS = "0001,0002";
process.env.ALLOWED_ADMIN_NIPS = "0001"; // user test = admin (boleh broadcast/send)
process.env.WA_API = "http://127.0.0.1:1/api/send"; // unreachable → health WA = error, tidak mengirim apa pun

const DB_PATH = path.join(__dirname, "../../config/db.js");
const MYSQL_PATH = path.join(__dirname, "../../config/dbMySQL.js");

// Properti mengikuti alias SQL: Phone AS phone, Name AS nama.
const USER = { Id_Employee: 1, nip: "0001", nama: "Budi", phone: "08123456789" };

const script = [
  { match: /SELECT 1/, result: () => ({ recordset: [{ n: 1 }] }) },
  { match: /FROM hris_Employee/, result: () => ({ recordset: [USER] }) },
  {
    match: /INSERT INTO message_jobs/,
    result: () => ({
      recordset: [
        {
          id: 1, type: "broadcast", status: "queued", total_count: 1,
          message: "x", recipients: "[]", file_path: null, file_mimetype: null,
          created_by_nip: "0001", schedule_id: null, idempotency_key: "k",
          error_message: null, created_at: new Date(), started_at: null,
          finished_at: null, success_count: 0, failed_count: 0,
        },
      ],
    }),
  },
  { match: /INSERT INTO message_deliveries/, result: () => ({ recordset: [] }) },
  { match: /FROM message_jobs/, result: () => ({ recordset: [] }) },
];

mockModule(DB_PATH, scriptedDb(script));
mockModule(MYSQL_PATH, { mysqlPool: fakeMySqlPool({ rows: [{ nama: "Test" }], total: 1 }) });

let server;
let base;

before(async () => {
  const { createApp } = require("../../server.js");
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  clearModule(DB_PATH);
  clearModule(MYSQL_PATH);
  clearModule(path.join(__dirname, "../../server.js"));
});

async function postJson(url, body, headers = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: resp.status, body: await resp.json() };
}

async function getJson(url, headers = {}) {
  const resp = await fetch(url, { headers });
  return { status: resp.status, body: await resp.json() };
}

test("GET /api/health → 200, backend & sqlServer & mysql ok", async () => {
  const { status, body } = await getJson(`${base}/api/health`);
  assert.strictEqual(status, 200);
  assert.strictEqual(body.status, "ok");
  assert.strictEqual(body.services.backend, "ok");
  assert.strictEqual(body.services.sqlServer, "ok");
  assert.strictEqual(body.services.mysql, "ok");
  assert.ok("whatsappGateway" in body.services);
});

test("POST /api/auth/login → sukses dengan NIP + nomor HP valid", async () => {
  const { status, body } = await postJson(`${base}/api/auth/login`, {
    nip: "0001",
    password: "08123456789",
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  assert.ok(body.token);
  assert.strictEqual(body.user.nip, "0001");
});

test("POST /api/auth/login → password salah = 401 dengan pesan generik", async () => {
  const { status, body } = await postJson(`${base}/api/auth/login`, {
    nip: "0001",
    password: "salah",
  });
  assert.strictEqual(status, 401);
  assert.strictEqual(body.message, "NIP atau password salah");
});

test("POST /api/auth/login → NIP tidak diwhitelist = 401 pesan sama (anti enumeration)", async () => {
  const { status, body } = await postJson(`${base}/api/auth/login`, {
    nip: "9999",
    password: "08123456789",
  });
  assert.strictEqual(status, 401);
  assert.strictEqual(body.message, "NIP atau password salah");
});

test("POST /api/auth/login → field kosong = 400", async () => {
  const { status } = await postJson(`${base}/api/auth/login`, { nip: "", password: "" });
  assert.strictEqual(status, 400);
});

test("GET /api/auth/profile → 200 dengan token valid", async () => {
  const login = await postJson(`${base}/api/auth/login`, { nip: "0001", password: "08123456789" });
  const { status, body } = await getJson(`${base}/api/auth/profile`, {
    Authorization: `Bearer ${login.body.token}`,
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.user.nama, "Budi");
  assert.strictEqual(body.user.role, "admin"); // 0001 terdaftar sebagai admin di env test
});

test("GET /api/auth/profile → tanpa token = 401", async () => {
  const { status } = await getJson(`${base}/api/auth/profile`);
  assert.strictEqual(status, 401);
});

test("GET /api/broadcast/employees → tanpa token = 401", async () => {
  const { status } = await getJson(`${base}/api/broadcast/employees`);
  assert.strictEqual(status, 401);
});

test("POST /api/broadcast/send → 201 dengan jobId (job queue)", async () => {
  const login = await postJson(`${base}/api/auth/login`, { nip: "0001", password: "08123456789" });
  const { status, body } = await postJson(
    `${base}/api/broadcast/send`,
    {
      message: "Pesan broadcast uji",
      employees: [{ id: "a", nama: "Andi", no_hp: "08123456789" }],
    },
    { Authorization: `Bearer ${login.body.token}` }
  );
  assert.strictEqual(status, 201);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.jobId, 1);
});

test("POST /api/broadcast/send → message kosong = 400", async () => {
  const login = await postJson(`${base}/api/auth/login`, { nip: "0001", password: "08123456789" });
  const { status } = await postJson(
    `${base}/api/broadcast/send`,
    { message: " ", employees: [{ no_hp: "08123456789" }] },
    { Authorization: `Bearer ${login.body.token}` }
  );
  assert.strictEqual(status, 400);
});

test("GET /api/monitoring/sim → 200 dengan token", async () => {
  const login = await postJson(`${base}/api/auth/login`, { nip: "0001", password: "08123456789" });
  const { status, body } = await getJson(`${base}/api/monitoring/sim`, {
    Authorization: `Bearer ${login.body.token}`,
  });
  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(body.data));
});

test("GET /api/simc/expiring → 200 dengan token", async () => {
  const login = await postJson(`${base}/api/auth/login`, { nip: "0001", password: "08123456789" });
  const { status } = await getJson(`${base}/api/simc/expiring?days=15`, {
    Authorization: `Bearer ${login.body.token}`,
  });
  assert.strictEqual(status, 200);
});
