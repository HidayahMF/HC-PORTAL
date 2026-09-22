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
