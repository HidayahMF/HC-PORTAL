// Stub modul via require.cache — tanpa dependency tambahan.
// Pemakaian: mockModule(<absolute path modul>, <exports pengganti>)
// lalu require modul target SETELAH stub dipasang.
"use strict";

const path = require("path");

function mockModule(modulePath, exportsObj) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: exportsObj,
  };
}

function clearModule(modulePath) {
  delete require.cache[require.resolve(modulePath)];
}

// Hapus semua module yang dibawah direktori root agar di-require ulang segar.
function clearModulesUnder(rootDir) {
  const abs = path.resolve(rootDir);
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(abs)) delete require.cache[key];
  }
}

module.exports = { mockModule, clearModule, clearModulesUnder };
