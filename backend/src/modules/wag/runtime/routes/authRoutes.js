const express = require("express");
const router = express.Router();

const {
    login,
} = require("../controllers/authController");

router.post("/login", login);

const { verifyToken } = require("../middleware/authMiddleware");
const { profile } = require("../controllers/profileController");

router.get("/profile", verifyToken, profile);

module.exports = router;
