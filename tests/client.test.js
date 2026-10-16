import { it, expect, vi } from 'vitest';
import client from '../src/api/client';
import { saveSession, readSession } from '../src/lib/session';
function session() {
  const token = `header.${btoa(JSON.stringify({ role: 'ADMIN', exp: Math.floor(Date.now()/1000)+3600 }))}.signature`;
  saveSession({ token }); return token;
}
const fail401 = (config) => Promise.reject({ config, response: { status: 401 } });
it('keeps login 401 on the current page without expiring another session', async () => {
  session();
  const listener = vi.fn();
  window.addEventListener('smartride:session-expired', listener);
  await expect(client.post('/auth/login', {}, { adapter: fail401 })).rejects.toBeDefined();
  expect(listener).not.toHaveBeenCalled();
  expect(readSession()).not.toBe(null);
  window.removeEventListener('smartride:session-expired', listener);
});
it('expires a rejected authenticated session without a hard page reload', async () => {
  session();
  const listener = vi.fn();
  window.addEventListener('smartride:session-expired', listener);
  await expect(client.get('/admin/users', { adapter: fail401 })).rejects.toBeDefined();
  expect(listener).toHaveBeenCalledOnce();
  expect(readSession()).toBe(null);
  window.removeEventListener('smartride:session-expired', listener);
});
it('uses /api and only attaches the bearer token to authenticated requests', async () => {
  const token = session();
  const adapter = vi.fn(async (config) => ({ config, data: {}, status: 200, headers: {} }));
  await client.get('/admin/users', { adapter });
  expect(adapter.mock.calls[0][0].baseURL).toBe('/api');
  expect(adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${token}`);
  await client.post('/auth/login', {}, { adapter });
  expect(adapter.mock.calls[1][0].headers.Authorization).toBeUndefined();
});
