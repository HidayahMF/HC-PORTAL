"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { isValidCron } = require("../../utils/cron");

test("isValidCron: ekspresi valid", () => {
  assert.strictEqual(isValidCron("*/5 * * * *"), true);
  assert.strictEqual(isValidCron("0 8 * * 1-5"), true);
  assert.strictEqual(isValidCron("30 8 * * *"), true);
  assert.strictEqual(isValidCron("0 9 * * 1,3,5"), true);
});

test("isValidCron: ekspresi invalid", () => {
  assert.strictEqual(isValidCron("not a cron"), false);
  assert.strictEqual(isValidCron("61 * * * *"), false); // menit > 59
  assert.strictEqual(isValidCron(""), false);
  assert.strictEqual(isValidCron("   "), false);
  assert.strictEqual(isValidCron(123), false);
  assert.strictEqual(isValidCron(null), false);
});

test("isValidCron: whitespace di sekitar tidak masalah", () => {
  assert.strictEqual(isValidCron(" 0 8 * * * "), true);
});
