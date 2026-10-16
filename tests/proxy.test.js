// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp, isAllowedApi } from '../server/app.js';

let upstream, server, origin, directory, lastRequest;
beforeAll(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'smartride-proxy-test-'));
  await fs.writeFile(path.join(directory, 'index.html'), '<!doctype html><title>Smart Ride</title>');
  upstream = http.createServer(async (req,res) => {
    const chunks = [];
    try { for await (const chunk of req) chunks.push(chunk); } catch { return; }
    lastRequest = { url: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString() };
    res.setHeader('Content-Type', 'application/json');
    if (req.url.includes('slow')) return;
    if (req.url.includes('redirect')) { res.writeHead(302, { Location: 'https://example.com' }); res.end(); return; }
    if (req.url.includes('disconnect')) { req.socket.destroy(); return; }
    if (req.url.endsWith('/auth/login') && lastRequest.body === 'bad') { res.writeHead(401); res.end('{"success":false}'); return; }
    if (req.url.includes('rejected')) { res.writeHead(401); res.end(JSON.stringify({ success: false, message: 'expired' })); return; }
    res.end(JSON.stringify({ success: true, data: { forwarded: true } }));
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const app = createApp({ upstreamOrigin: `http://127.0.0.1:${upstream.address().port}`, staticDir: directory, production: false });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening',resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  await Promise.all([server,upstream].map((item) => new Promise((resolve) => { item.close(resolve); item.closeAllConnections(); })));
  await fs.rm(directory, { recursive: true, force: true });
});
describe('same-origin API relay', () => {
  it('forwards the exact login path and JSON without browser origin or cookies', async () => {
    const body = JSON.stringify({ employeeId: 'test-user', password: 'test-password' });
    const response = await fetch(origin+'/api/auth/login', { method: 'POST', headers: { 'Content-Type':'application/json', Origin: origin, Cookie: 'session=do-not-forward' }, body });
    expect(response.status).toBe(200);
    expect(lastRequest.url).toBe('/api/auth/login');
    expect(lastRequest.body).toBe(body);
    expect(lastRequest.headers.origin).toBeUndefined();
    expect(lastRequest.headers.cookie).toBeUndefined();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('keeps bearer authentication on admin requests and rejects missing auth', async () => {
    expect((await fetch(origin+'/api/admin/users')).status).toBe(401);
    const response = await fetch(origin+'/api/admin/users', { headers: { Authorization: 'Bearer test-token' } });
    expect(response.status).toBe(200);
    expect(lastRequest.headers.authorization).toBe('Bearer test-token');
  });
  it('preserves multipart boundaries and file bytes', async () => {
    const body = new FormData();
    body.append('file', new Blob(['spreadsheet-bytes'], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'taxi.xlsx');
    const response = await fetch(origin+'/api/admin/excel/settlements', { method:'POST', headers:{ Authorization:'Bearer test-token' }, body });
    expect(response.status).toBe(200);
    expect(lastRequest.headers['content-type']).toContain('multipart/form-data; boundary=');
    expect(lastRequest.body).toContain('filename="taxi.xlsx"');
    expect(lastRequest.body).toContain('spreadsheet-bytes');
  });
  it('rejects cross-site writes and never acts as an arbitrary proxy', async () => {
    expect((await fetch(origin+'/api/auth/login', { method:'POST', headers:{ Origin:'https://unrelated.example' } })).status).toBe(403);
    expect((await fetch(origin+'/api/unknown')).status).toBe(404);
    expect((await fetch(origin+'/api/admin/users', { method:'PATCH' })).status).toBe(404);
    expect(isAllowedApi('DELETE', '/api/admin/users/a%2Fb')).toBe(false);
  });
  it('preserves upstream auth failures', async () => {
    const response = await fetch(origin+'/api/admin/users/rejected', { headers:{ Authorization:'Bearer invalid' } });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success:false, message:'expired' });
  });
  it('serves deep links and health checks without relaying them', async () => {
    expect(await (await fetch(origin+'/healthz')).json()).toEqual({ status:'ok' });
    const response = await fetch(origin+'/notices');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Smart Ride');
    expect(response.headers.get('cache-control')).toBe('no-cache');
  });
  it('rejects an unsafe or incorrectly configured upstream', () => {
    for (const upstreamOrigin of ['file:///tmp/file','https://name:password@example.com','https://example.com/api']) expect(() => createApp({ upstreamOrigin })).toThrow();
    expect(() => createApp({ upstreamOrigin:'http://example.com', production:true })).toThrow();
  });
  it('turns upstream redirects and disconnected requests into clear gateway errors', async () => {
    for (const name of ['redirect','disconnect']) {
      const response = await fetch(origin+'/api/admin/users/'+name, { headers:{ Authorization:'Bearer test-token' } });
      expect(response.status).toBe(502);
      expect((await response.json()).success).toBe(false);
    }
  });
  it('limits failed login attempts', async () => {
    await withServer({ loginLimit: 1 }, async (base) => {
      expect((await fetch(base+'/api/auth/login', { method:'POST', body:'bad' })).status).toBe(401);
      expect((await fetch(base+'/api/auth/login', { method:'POST', body:'bad' })).status).toBe(429);
    });
  });
  it('enforces the streamed request body limit', async () => {
    await withServer({ proxyOptions: { maxBytes:8 } }, async (base) => {
      const response = await fetch(base+'/api/auth/login', { method:'POST', body:'123456789' });
      expect(response.status).toBe(413);
    });
  });
  it('times out an upstream which never responds', async () => {
    await withServer({ proxyOptions: { timeoutMs:50 } }, async (base) => {
      const response = await fetch(base+'/api/admin/users/slow', { headers:{ Authorization:'Bearer test-token' } });
      expect(response.status).toBe(504);
    });
  });
});

async function withServer(options, run) {
  const app = createApp({ upstreamOrigin: `http://127.0.0.1:${upstream.address().port}`, production:false, ...options });
  const local = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => local.once('listening',resolve));
  try { await run(`http://127.0.0.1:${local.address().port}`); }
  finally { await new Promise((resolve) => { local.close(resolve); local.closeAllConnections(); }); }
}
