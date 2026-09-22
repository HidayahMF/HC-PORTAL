"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { validateFileMagic } = require("../../config/upload");

function writeTemp(name, buffer) {
  const p = path.join(os.tmpdir(), `wag-test-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
  fs.writeFileSync(p, buffer);
  return p;
}

test("validateFileMagic: file PNG asli diterima sebagai image/png", () => {
  const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const p = writeTemp("a.png", buf);
  try {
    assert.strictEqual(validateFileMagic(p, "image/png"), true);
  } finally {
    fs.unlinkSync(p);
  }
});

test("validateFileMagic: file JPEG asli diterima sebagai image/jpeg", () => {
  const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const p = writeTemp("a.jpg", buf);
  try {
    assert.strictEqual(validateFileMagic(p, "image/jpeg"), true);
  } finally {
    fs.unlinkSync(p);
  }
});

test("validateFileMagic: file PDF asli diterima sebagai application/pdf", () => {
  const p = writeTemp("a.pdf", Buffer.from("%PDF-1.4\n..."));
  try {
    assert.strictEqual(validateFileMagic(p, "application/pdf"), true);
  } finally {
    fs.unlinkSync(p);
  }
});

test("validateFileMagic: file teks yang diklaim JPG DITOLAK (bukan magic bytes)", () => {
  const p = writeTemp("fake.jpg", Buffer.from("not really an image content"));
  try {
    assert.strictEqual(validateFileMagic(p, "image/jpeg"), false);
  } finally {
    fs.unlinkSync(p);
  }
});

test("validateFileMagic: MP4 diterima (video tidak diperketat)", () => {
  const buf = Buffer.concat([Buffer.from("00000020"), Buffer.from("ftypisom"), Buffer.alloc(8)]);
  const p = writeTemp("v.mp4", buf);
  try {
    assert.strictEqual(validateFileMagic(p, "video/mp4"), true);
  } finally {
    fs.unlinkSync(p);
  }
});

test("validateFileMagic: path tidak ada → false", () => {
  assert.strictEqual(validateFileMagic("/tidak/ada/file.jpg", "image/jpeg"), false);
});
