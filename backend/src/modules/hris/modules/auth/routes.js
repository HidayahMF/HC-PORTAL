const { Router } = require('express');
const { asyncHandler, httpError } = require('../../lib/http.js');
const { signToken, requireAuth } = require('../../middleware/auth.js');
const service = require('./service.js');

function authRouter() {
  const r = Router();

  // Padanan hris/login_validate() -> autentikasi hris_Employee (NIP + tanggal lahir ddmmyy)
  r.post(
    '/login',
    asyncHandler(async (req, res) => {
      const { username, password } = req.body || {};
      if (!username || !password) throw httpError(400, 'NIP dan tanggal lahir wajib diisi');
      const user = await service.login(username, password);
      const token = signToken(user);
      res.json({ token, user });
    })
  );

  // Padanan hris/logout() + info session dashboard
  r.post('/logout', requireAuth, (_req, res) => res.json({ ok: true }));
  r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

  return r;
}

module.exports = { authRouter };
