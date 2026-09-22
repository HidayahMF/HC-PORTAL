"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

const SECRET = "test-secret-0123456789abcdef-0123456789";
process.env.JWT_SECRET = SECRET;

function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.body = obj;
    return res;
  };
  return res;
}

function sign(payload, opts) {
  return jwt.sign(payload, SECRET, opts);
}

test("verifyToken: tanpa token → 401", () => {
  const req = { headers: {} };
  const res = makeRes();
  let called = false;
  verifyToken(req, res, () => { called = true; });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(called, false);
});

test("verifyToken: skema bukan Bearer → 401", () => {
  const req = { headers: { authorization: "Basic abc123" } };
  const res = makeRes();
  verifyToken(req, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

test("verifyToken: token malformed → 401", () => {
  const req = { headers: { authorization: "Bearer ini.bukan.token" } };
  const res = makeRes();
  verifyToken(req, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

test("verifyToken: token kedaluwarsa → 401", () => {
  const token = sign({ id: 1, nip: "0001", nama: "A", role: "operator" }, { expiresIn: "-10s" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = makeRes();
  verifyToken(req, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

test("verifyToken: payload tanpa role valid → 401", () => {
  const token = sign({ id: 1, nip: "0001", nama: "A" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = makeRes();
  verifyToken(req, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

test("verifyToken: role tidak dikenal → 401", () => {
  const token = sign({ id: 1, nip: "0001", nama: "A", role: "superuser" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = makeRes();
  verifyToken(req, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

test("verifyToken: token valid → next dipanggil & req.user terisi", () => {
  const token = sign({ id: 7, nip: "0001", nama: "Budi", role: "operator" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = makeRes();
  let called = false;
  verifyToken(req, res, () => { called = true; });
  assert.strictEqual(called, true);
  assert.deepStrictEqual(req.user, { id: 7, nip: "0001", nama: "Budi", role: "operator" });
});

test("requireRole: viewer dilarang aksi operator (403)", () => {
  const res = makeRes();
  requireRole("operator")({ user: { role: "viewer" } }, res, () => {});
  assert.strictEqual(res.statusCode, 403);
});

test("requireRole: viewer dilarang aksi admin (403)", () => {
  const res = makeRes();
  requireRole("admin")({ user: { role: "viewer" } }, res, () => {});
  assert.strictEqual(res.statusCode, 403);
});

test("requireRole: operator boleh aksi viewer/operator, dilarang admin", () => {
  let ok = false;
  const res1 = makeRes();
  requireRole("viewer")({ user: { role: "operator" } }, res1, () => { ok = true; });
  assert.strictEqual(ok, true);

  const res2 = makeRes();
  requireRole("operator")({ user: { role: "operator" } }, res2, () => { ok = true; });
  assert.strictEqual(ok, true);

  const res3 = makeRes();
  requireRole("admin")({ user: { role: "operator" } }, res3, () => {});
  assert.strictEqual(res3.statusCode, 403);
});

test("requireRole: admin boleh semua level", () => {
  for (const min of ["viewer", "operator", "admin"]) {
    let ok = false;
    const res = makeRes();
    requireRole(min)({ user: { role: "admin" } }, res, () => { ok = true; });
    assert.strictEqual(ok, true, `admin harus boleh requireRole(${min})`);
  }
});
