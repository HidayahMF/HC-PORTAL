const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

async function copyToNetworkPath({ srcPath, destPath }) {
  if (!srcPath || !fs.existsSync(srcPath)) {
    throw new Error(`Source file tidak ditemukan: ${srcPath}`);
  }

  const destDir = path.dirname(destPath);

  // Buat folder tujuan jika belum ada (untuk Linux/Docker).
  if (!fs.existsSync(destDir)) {
    try {
      fs.mkdirSync(destDir, { recursive: true });
      logger.debug("created dest dir", { destDir });
    } catch (err) {
      throw new Error(`Gagal membuat folder tujuan: ${destDir} — ${err.message}`);
    }
  }

  try {
    fs.copyFileSync(srcPath, destPath);
    logger.debug("SMB copy success", { destPath });
    return destPath;
  } catch (err) {
    logger.error("SMB copy failed", { destPath, err: err?.message });
    throw err;
  }
}

module.exports = { copyToNetworkPath };
