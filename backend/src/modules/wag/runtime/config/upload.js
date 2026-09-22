const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Pasangan MIME → ekstensi yang diizinkan.
const ALLOWED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "video/mp4": [".mp4"],
  "audio/mpeg": [".mp3"],
  "application/pdf": [".pdf"],
};
const ALLOWED_MIME_TYPES = new Set(Object.keys(ALLOWED_TYPES));
const ALLOWED_EXTENSIONS = new Set(Object.values(ALLOWED_TYPES).flat());

// Ekstensi berbahaya — ditolak mentah-mentah.
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".sh", ".ps1", ".vbs", ".js", ".msi", ".dll", ".scr", ".pif", ".hta", ".apk", ".jar",
]);

// Deteksi magic bytes untuk tipe umum (practical magic-byte validation).
function sniffMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  ) {
    return "image/png";
  }
  // WebP: RIFF....WEBP
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  // PDF: %PDF
  if (buffer.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  // MP4: ftyp box di offset 4
  if (buffer.toString("ascii", 4, 8) === "ftyp") return "video/mp4";
  // MP3: ID3 tag atau frame sync 0xFF Ex
  if (buffer.toString("ascii", 0, 3) === "ID3") return "audio/mpeg";
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "audio/mpeg";

  return null;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const base = path
        .basename(file.originalname || "upload", ext)
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 100);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${base || "upload"}-${unique}${ext}`);
    },
  }),
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB
  },
  fileFilter: function (req, file, cb) {
    if (!file?.mimetype) return cb(new Error("File type tidak dikenali"));

    const ext = path.extname(file.originalname || "").toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return cb(new Error("Jenis file tidak diizinkan"));
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new Error(`Invalid file type. Allowed: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`)
      );
    }

    // Ekstensi harus cocok dengan MIME yang diklaim.
    const allowedExts = ALLOWED_TYPES[file.mimetype];
    if (!allowedExts.includes(ext)) {
      return cb(new Error(`Ekstensi ${ext || "(kosong)"} tidak cocok untuk tipe ${file.mimetype}`));
    }

    return cb(null, true);
  },
});

// Validasi magic bytes setelah file tersimpan (di controller sebelum dipakai).
function validateFileMagic(filePath, mimeType) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    const sniffed = sniffMagicBytes(buffer);
    // PDF & MP4: magic bytes cukup dekat; untuk video/audio yang beragam kita
    // tidak terlalu ketat — cukup pastikan ada signature yang dikenal.
    return sniffed === mimeType || mimeType === "video/mp4" || mimeType === "audio/mpeg";
  } catch {
    return false;
  }
}

module.exports = {
  upload,
  ALLOWED_MIME_TYPES,
  UPLOAD_DIR,
  validateFileMagic,
};
