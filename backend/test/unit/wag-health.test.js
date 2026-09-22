const test = require('node:test');
const assert = require('node:assert/strict');

test('WAG health check does not POST to the send endpoint', async () => {
  process.env.WA_API = 'http://127.0.0.1:1/send';
  delete process.env.WA_HEALTH_URL;
  const { createApp } = require('../../src/modules/wag/runtime/server');
  const app = createApp();
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await response.json();
    assert.equal(body.services.whatsappGateway, 'not_checked');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
