const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

// Validasi payload token: hanya menerima struktur yang kita buat sendiri.
function isValidPayload(decoded) {
  return (
    decoded &&
    typeof decoded === "object" &&
    typeof decoded.id !== "undefined" &&
    typeof decoded.nip === "string" &&
    decoded.nip.length > 0 &&
    (decoded.role === "admin" || decoded.role === "operator" || decoded.role === "viewer")
  );
}

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (!token || scheme !== "Bearer") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET missing during token verification");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!isValidPayload(decoded)) {
      logger.warn("invalid JWT payload rejected", { nip: decoded?.nip });
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.user = { id: decoded.id, nip: decoded.nip, nama: decoded.nama, role: decoded.role };
    return next();
  } catch (err) {
    // Token kedaluwarsa / malformed / signature salah — semua dibalas pesan generik.
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

// Otorisasi berbasis role. Urutan kekuatan: viewer < operator < admin.
const ROLE_RANK = { viewer: 1, operator: 2, admin: 3 };

// requireRole("operator") → boleh dipakai admin & operator (tidak termasuk viewer).
// requireRole("admin")  → hanya admin.
function requireRole(minRole) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || (ROLE_RANK[role] || 0) < (ROLE_RANK[minRole] || 0)) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }
    return next();
  };
}

module.exports = { verifyToken, requireRole, ROLE_RANK };
