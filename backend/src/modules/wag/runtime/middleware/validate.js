// Validasi parameter ID route: harus integer positif.
function validateIdParam(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "ID tidak valid", code: "INVALID_ID" });
  }
  req.params.id = id;
  return next();
}

module.exports = { validateIdParam };
