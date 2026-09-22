"use strict";
const { test } = require("node:test");
const assert = require("node:assert");

// Simpan env asli lalu pulihkan setelah test.
const { getRoleForNip, getAllowedNips, getAllowedOrigins } = require("../../config/env");

const ORIGINAL = {
  ALLOWED_ADMIN_NIPS: process.env.ALLOWED_ADMIN_NIPS,
  ALLOWED_VIEWER_NIPS: process.env.ALLOWED_VIEWER_NIPS,
  ALLOWED_NIPS: process.env.ALLOWED_NIPS,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
};

test.after(() => {
  for (const [k, v] of Object.entries(ORIGINAL)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test("getRoleForNip: admin/viewer dari env, NIP lain → viewer (default terkunci)", () => {
  process.env.ALLOWED_ADMIN_NIPS = "0001";
  process.env.ALLOWED_VIEWER_NIPS = "0002";
  assert.strictEqual(getRoleForNip("0001"), "admin");
  assert.strictEqual(getRoleForNip("0002"), "viewer");
  assert.strictEqual(getRoleForNip("9999"), "viewer");
});

test("getRoleForNip: env kosong → admin default 3490/0377, sisanya viewer", () => {
  process.env.ALLOWED_ADMIN_NIPS = "";
  process.env.ALLOWED_VIEWER_NIPS = " ";
  assert.strictEqual(getRoleForNip("3490"), "admin");
  assert.strictEqual(getRoleForNip("0377"), "admin");
  assert.strictEqual(getRoleForNip("0001"), "viewer");
  assert.strictEqual(getRoleForNip("3491"), "viewer");
});

test("getRoleForNip: whitespace di daftar NIP dibersihkan", () => {
  process.env.ALLOWED_ADMIN_NIPS = " 0001 , 0002 ";
  assert.strictEqual(getRoleForNip("0002"), "admin");
});

test("getAllowedNips: parsing comma-separated dengan trim & filter kosong", () => {
  process.env.ALLOWED_NIPS = " 0001,0002 , ,0003";
  assert.deepStrictEqual(getAllowedNips(), ["0001", "0002", "0003"]);
});

test("getAllowedNips: kosong → array kosong", () => {
  process.env.ALLOWED_NIPS = "";
  assert.deepStrictEqual(getAllowedNips(), []);
});

test("getAllowedOrigins: multi-origin dipisah koma", () => {
  process.env.CORS_ORIGIN = "http://localhost:3002, https://app.example.com";
  assert.deepStrictEqual(getAllowedOrigins(), ["http://localhost:3002", "https://app.example.com"]);
});

test("getAllowedOrigins: kosong → array kosong", () => {
  process.env.CORS_ORIGIN = "";
  assert.deepStrictEqual(getAllowedOrigins(), []);
});
