// Lint ringan backend: verifikasi sintaks semua file .js (node --check).
// Bukan pengganti ESLint penuh, tapi menjamin tidak ada syntax error.
"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", "uploads", ".git", "dist"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(p, out);
    } else if (entry.name.endsWith(".js")) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(ROOT);
let failed = 0;

for (const f of files) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
  } catch (err) {
    failed++;
    console.error(`SYNTAX FAIL: ${path.relative(process.cwd(), f)}`);
    console.error(String(err.stderr || "").trim());
  }
}

if (failed > 0) {
  console.error(`Syntax check: ${failed} file(s) gagal dari ${files.length}`);
  process.exit(1);
}
console.log(`Syntax check OK: ${files.length} file(s) valid`);
