const axios = require("axios");
const fs = require("fs");
const path = require("path");

const logger = require("../utils/logger");
const { copyToNetworkPath } = require("../config/networkCopy");
const { validatePhone } = require("../utils/phone");

// SATU-SATUNYA pintu keluar ke WhatsApp Gateway.
// Semua controller/service WAJIB lewat sini — jangan panggil axios ke gateway langsung.

async function sendWhatsApp(no, text) {
  const waApi = process.env.WA_API;
  if (!waApi) {
    throw new Error("WA_API environment variable is not set (set WA_API di backend/.env)");
  }

  const { valid, phone } = validatePhone(no);
  if (!valid) {
    throw new Error("Nomor HP tidak valid");
  }

  try {
    const response = await axios.post(
      waApi,
      { no: phone, text, media: "", file: "" },
      { timeout: 15000, headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    logger.error("WA gateway text send failed", { status, err: err?.message });
    throw new Error(
      `WA gateway error${status ? ` (status ${status})` : ""}: ${typeof data === "object" ? JSON.stringify(data) : data || err.message}`
    );
  }
}

function getMimeMode(mimeType) {
  return mimeType === "application/pdf" ? "document" : "media";
}

async function sendWhatsAppWithMedia(no, text, localFilePath, mimeType) {
  const wagwApi = process.env.WAGW_API;
  const wagwFileDir = process.env.WAGW_FILE_DIR;
  const smbMount = process.env.WAGW_SMB_MOUNT || "/mnt/wagw";

  if (!wagwApi) {
    throw new Error(
      "WAGW_API tidak di-set. Pastikan backend memakai .env yang benar dan server.js/load dotenv aktif."
    );
  }
  if (!wagwFileDir) {
    throw new Error(
      "WAGW_FILE_DIR tidak di-set. Pastikan backend memakai .env yang benar dan server.js/load dotenv aktif."
    );
  }
  if (!localFilePath || !fs.existsSync(localFilePath)) {
    throw new Error(`File tidak ditemukan: ${localFilePath}`);
  }

  const { valid, phone } = validatePhone(no);
  if (!valid) {
    throw new Error("Nomor HP tidak valid");
  }

  const filename = path.basename(localFilePath);
  const isLinux = process.platform === "linux";

  let destCopyPath;
  let remoteDestPathOnVm;

  if (isLinux) {
    // Docker (Linux): copy ke volume mount SMB, path WAGW tetap Windows
    destCopyPath = path.join(smbMount, "file", filename);
    remoteDestPathOnVm = path.join(wagwFileDir, filename).replace(/\//g, "\\");
  } else {
    // Local (Windows): pakai UNC path. Host SMB WAJIB dari environment
    // (WAGW_SMB_HOST) — tidak ada lagi IP internal hardcoded.
    const smbHost = process.env.WAGW_SMB_HOST;
    if (!smbHost) {
      throw new Error(
        "WAGW_SMB_HOST tidak di-set. Di development Windows, setel WAGW_SMB_HOST " +
          "(host SMB share WAGW, mis. 10.x.x.x) di backend/.env."
      );
    }
    const smbDir = path.win32.join(`\\\\${smbHost}`, "file");
    destCopyPath = path.win32.join(smbDir, filename);
    const normalizedDir = path.win32.normalize(wagwFileDir);
    remoteDestPathOnVm = path.win32.join(normalizedDir, filename);
  }

  await copyToNetworkPath({
    srcPath: localFilePath,
    destPath: destCopyPath,
  });

  // Beri waktu SMB share untuk sinkron sebelum gateway membaca file.
  await new Promise((r) => setTimeout(r, 1000));

  const mode = getMimeMode(mimeType);
  const payload = {
    no: phone,
    text,
    media: mode === "media" ? remoteDestPathOnVm : "",
    file: mode === "document" ? remoteDestPathOnVm : "",
  };

  logger.debug("WA media send payload", { mode });

  const response = await axios.post(wagwApi, payload, {
    timeout: 60000,
    headers: { "Content-Type": "application/json" },
  });

  logger.debug("WA media send response received", { status: response.status });

  return response.data;
}

module.exports = { sendWhatsApp, sendWhatsAppWithMedia };
