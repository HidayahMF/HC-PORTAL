"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { normalizePhone, validatePhone } = require("../../utils/phone");

test("normalizePhone: awalan 08 diubah ke 62", () => {
  assert.strictEqual(normalizePhone("08123456789"), "628123456789");
});

test("normalizePhone: awalan 8 diubah ke 62", () => {
  assert.strictEqual(normalizePhone("8123456789"), "628123456789");
});

test("normalizePhone: 628 tetap 628", () => {
  assert.strictEqual(normalizePhone("628123456789"), "628123456789");
});

test("normalizePhone: +62 diubah ke 62 (karakter non-digit dibuang)", () => {
  assert.strictEqual(normalizePhone("+628123456789"), "628123456789");
});

test("normalizePhone: nilai kosong/null/undefined dikembalikan kosong", () => {
  assert.strictEqual(normalizePhone(""), "");
  assert.strictEqual(normalizePhone(null), "");
  assert.strictEqual(normalizePhone(undefined), "");
});

test("normalizePhone: angka dikonversi dari number", () => {
  assert.strictEqual(normalizePhone(8123456789), "628123456789");
});

test("validatePhone: 08xxxxxxxx valid → 62xx", () => {
  const r = validatePhone("08123456789");
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.phone, "628123456789");
});

test("validatePhone: 8xxxxxxxx valid → 62xx", () => {
  const r = validatePhone("8123456789");
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.phone, "628123456789");
});

test("validatePhone: 628xxxxxxxx valid", () => {
  const r = validatePhone("628123456789");
  assert.strictEqual(r.valid, true);
});

test("validatePhone: terlalu pendek (<10 digit) tidak valid", () => {
  const r = validatePhone("0812345");
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.reason, "too_short");
});

test("validatePhone: terlalu panjang (>15 digit) tidak valid", () => {
  const r = validatePhone("08123456789012345678");
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.reason, "too_long");
});

test("validatePhone: nomor internasional non-62 tidak valid (tidak diam-diam menghasilkan nomor salah)", () => {
  const r = validatePhone("+18005555555");
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.reason, "not_international");
});

test("validatePhone: kosong tidak valid", () => {
  assert.strictEqual(validatePhone("").valid, false);
  assert.strictEqual(validatePhone(null).valid, false);
});
