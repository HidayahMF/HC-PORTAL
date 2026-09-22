"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { fillTemplate } = require("../../utils/template");

test("fillTemplate: placeholder diganti dengan data", () => {
  const out = fillTemplate("Yth. {{nama}}, SIM {{jenis}} habis pada {{tanggal}}.", {
    nama: "Budi",
    jenis: "C",
    tanggal: "31-12-2026",
  });
  assert.strictEqual(out, "Yth. Budi, SIM C habis pada 31-12-2026.");
});

test("fillTemplate: key yang tidak ada diganti string kosong", () => {
  const out = fillTemplate("Halo {{nama}}, divisi {{divisi}}.", { nama: "Ani" });
  assert.strictEqual(out, "Halo Ani, divisi .");
});

test("fillTemplate: nilai null/undefined → kosong", () => {
  assert.strictEqual(fillTemplate("{{a}}|{{b}}", { a: null, b: undefined }), "|");
});

test("fillTemplate: whitespace di dalam kurung tetap dikenali", () => {
  assert.strictEqual(fillTemplate("{{ nama }}", { nama: "X" }), "X");
});

test("fillTemplate: bukan string → kosong", () => {
  assert.strictEqual(fillTemplate(null, {}), "");
  assert.strictEqual(fillTemplate(123, {}), "");
});

test("fillTemplate: data undefined aman", () => {
  assert.strictEqual(fillTemplate("{{a}}", undefined), "");
});
