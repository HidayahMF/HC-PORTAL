const express = require("express");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { getSimMonitoring } = require("../controllers/monitoringController");

const monitoringRouter = express.Router();

monitoringRouter.get("/sim", verifyToken, requireRole("viewer"), getSimMonitoring);

module.exports = { monitoringRouter };
