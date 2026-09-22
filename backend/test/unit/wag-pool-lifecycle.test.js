const test = require('node:test');
const assert = require('node:assert/strict');

test('WAG SQL and MySQL pool modules are lazy and expose a stable awaitable interface', async () => {
  const sqlDb = require('../../src/modules/wag/runtime/config/db');
  const mysqlDb = require('../../src/modules/wag/runtime/config/dbMySQL');

  assert.equal(sqlDb.isInitialized(), false);
  assert.equal(mysqlDb.isInitialized(), false);
  assert.equal(typeof sqlDb.poolPromise.then, 'function');
  assert.equal(typeof mysqlDb.mysqlPool.then, 'function');
  assert.equal(typeof sqlDb.closePool, 'function');
  assert.equal(typeof mysqlDb.closePool, 'function');

  await sqlDb.closePool();
  await mysqlDb.closePool();
  assert.equal(sqlDb.isInitialized(), false);
  assert.equal(mysqlDb.isInitialized(), false);
});
