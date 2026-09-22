process.env.JWT_SECRET = process.env.JWT_SECRET || '12345678901234567890123456789012';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');

test('unified module namespaces do not allow unauthenticated cross-module access', async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const { port } = server.address();
    for (const path of ['/api/nomor-surat/auth/me', '/api/kontrak/auth/me', '/api/wag/auth/profile']) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      assert.equal(response.status, 401, path);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('unified API keeps public Nomor Surat validation and module route boundaries', async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const invalidLetter = await fetch(`http://127.0.0.1:${port}/api/nomor-surat/letters`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
    assert.equal(invalidLetter.status, 400);
    const invalidContract = await fetch(`http://127.0.0.1:${port}/api/kontrak/contracts/not-an-id`);
    assert.equal(invalidContract.status, 401);
    const invalidWag = await fetch(`http://127.0.0.1:${port}/api/wag/simc/expiring?days=15`);
    assert.equal(invalidWag.status, 401);
    const unknown = await fetch(`http://127.0.0.1:${port}/api/wag/not-a-route`);
    assert.equal(unknown.status, 404);
    const ready = await fetch(`http://127.0.0.1:${port}/readyz`);
    assert.equal(ready.status, 503);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
