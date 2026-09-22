const express = require("express");
const {
  getEmployees,
  sendBroadcast,
  getJobStatus,
  getJobRecipients,
} = require("../controllers/broadcastController");

const { upload } = require("../config/upload");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");
const { isProd } = require("../config/env");

const router = express.Router();

const broadcastLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 10 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Terlalu banyak broadcast, coba lagi nanti" },
});

// Semua endpoint butuh login; operasi kirim butuh minimal operator.
router.get("/employees", verifyToken, requireRole("viewer"), getEmployees);
router.post("/send", verifyToken, requireRole("operator"), broadcastLimiter, upload.single("file"), sendBroadcast);
router.get("/jobs/:id", verifyToken, requireRole("viewer"), getJobStatus);
router.get("/jobs/:id/recipients", verifyToken, requireRole("viewer"), getJobRecipients);

module.exports = router;
