const express = require("express");
const router = express.Router();
const {
  getAll,
  getById,
  create,
  update,
  remove,
  toggleActive,
} = require("../controllers/scheduledMessageController");
const { upload } = require("../config/upload");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { validateIdParam } = require("../middleware/validate");

router.use(verifyToken);

router.get("/", requireRole("viewer"), getAll);
router.get("/:id", requireRole("viewer"), validateIdParam, getById);
router.post("/", requireRole("operator"), upload.single("file"), create);
router.put("/:id", requireRole("operator"), validateIdParam, upload.single("file"), update);
router.delete("/:id", requireRole("operator"), validateIdParam, remove);
router.patch("/:id/toggle", requireRole("operator"), validateIdParam, toggleActive);

module.exports = router;
