import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { app } from '../src/app';

let server: http.Server;
let baseUrl: string;
let cookie = '';

test.before(async () => { server = app.listen(0); await new Promise<void>((resolve) => server.once('listening', () => resolve())); const address = server.address(); if (!address || typeof address === 'string') throw new Error('Test server did not start.'); baseUrl = `http://127.0.0.1:${address.port}`; });
test.after(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

async function call(path: string, options: RequestInit = {}) { const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(options.headers ?? {}) } }); const body = await response.json() as { success: boolean; data?: { user?: { nip: string; role: string; isActive: boolean } }; message?: string }; const setCookie = response.headers.get('set-cookie'); if (setCookie) cookie = setCookie.split(';')[0]; return { response, body }; }

test('rejects invalid login input with generic error', async () => { const result = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ nip: '', birthDate: '' }) }); assert.equal(result.response.status, 401); assert.equal(result.body.message, 'NIP atau tanggal lahir tidak valid.'); });
test('logs in active configured admin and returns minimal user profile', async () => { const result = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ nip: '3490', birthDate: '2008-04-11' }) }); assert.equal(result.response.status, 200); assert.equal(result.body.data?.user?.nip, '3490'); assert.equal(result.body.data?.user?.role, 'ADMIN'); assert.equal(result.body.data?.user?.isActive, true); assert.ok(cookie.includes('bmc_access_token=')); });
test('auth me reads the http-only cookie', async () => { const result = await call('/api/auth/me'); assert.equal(result.response.status, 200); assert.equal(result.body.data?.user?.nip, '3490'); });
test('rejects wrong birth date and keeps generic error', async () => { const result = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ nip: '3490', birthDate: '2008-04-12' }) }); assert.equal(result.response.status, 401); assert.equal(result.body.message, 'NIP atau tanggal lahir tidak valid.'); });
test('logout clears the session', async () => { const result = await call('/api/auth/logout', { method: 'POST' }); assert.equal(result.response.status, 200); cookie = ''; const me = await call('/api/auth/me'); assert.equal(me.response.status, 401); });
