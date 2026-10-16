import { describe, it, expect } from 'vitest';
import { validateExcel, validateImages, validatePassword, MAX_EXCEL_BYTES, MAX_IMAGE_BYTES } from '../src/lib/validation';
import { tokenPayload, validAdminToken, readSession, saveSession } from '../src/lib/session';
const jwt = (payload) => `header.${btoa(JSON.stringify(payload))}.signature`;
describe('file and session validation', () => {
  it('rejects arbitrary dropped files, empty and oversized spreadsheets', () => {
    expect(validateExcel({ name: 'taxi.xlsx', size: 14071 })).toBe('');
    for (const file of [null, { name: 'taxi.exe', size: 20 }, { name: 'taxi.xlsx', size: 0 }, { name: 'taxi.xlsx', size: MAX_EXCEL_BYTES + 1 }]) expect(validateExcel(file)).not.toBe('');
  });
  it('enforces allowed image formats, per-file size and combined attachment count', () => {
    const file = { name: 'photo.png', type: 'image/png', size: 200 };
    expect(validateImages([file], 4)).toBe('');
    expect(validateImages([file], 5)).not.toBe('');
    expect(validateImages([{ ...file, type: 'image/svg+xml' }])).not.toBe('');
    expect(validateImages([{ ...file, size: MAX_IMAGE_BYTES + 1 }])).not.toBe('');
  });
  it('does not accept expired, missing-role or malformed tokens', () => {
    const exp = Math.floor(Date.now()/1000);
    expect(validAdminToken(jwt({ role: 'ADMIN', exp: exp + 3600 }))).toBe(true);
    for (const token of ['invalid', jwt({ role: 'ADMIN', exp: exp-1 }), jwt({ role: 'DRIVER', exp: exp+10 }), jwt({ role: 'ADMIN' })]) expect(validAdminToken(token)).toBe(false);
    expect(tokenPayload(undefined)).toBe(null);
    saveSession({ token: jwt({ role: 'ADMIN', exp: exp-1 }) });
    expect(readSession()).toBe(null);
  });
  it('does not trim passwords and enforces length bounds', () => {
    expect(validatePassword(' a long password ')).toBe('');
    expect(validatePassword('short')).not.toBe('');
    expect(validatePassword('x'.repeat(129))).not.toBe('');
  });
});
