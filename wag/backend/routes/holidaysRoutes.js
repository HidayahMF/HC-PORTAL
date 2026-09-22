const express = require("express");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { validateIdParam } = require("../middleware/validate");
const rateLimit = require("express-rate-limit");
const { isProd } = require("../config/env");
const holidaysController = require("../controllers/holidaysController");

const holidaysRouter = express.Router();

// Import bulk besar & intensif DB — batasi agar tidak bisa di-spam.
const bulkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 10 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Terlalu banyak import bulk, coba lagi nanti" },
});

holidaysRouter.get("/", verifyToken, requireRole("viewer"), holidaysController.getAll);
holidaysRouter.post("/", verifyToken, requireRole("operator"), holidaysController.create);
holidaysRouter.post("/bulk", verifyToken, requireRole("operator"), bulkLimiter, holidaysController.createBulk);
holidaysRouter.delete("/:id", verifyToken, requireRole("operator"), validateIdParam, holidaysController.remove);

module.exports = { holidaysRouter };
