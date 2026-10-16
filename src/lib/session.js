const KEY = 'smartride.session';
export function tokenPayload(token) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}
export function validAdminToken(token) {
  const payload = tokenPayload(token);
  return payload?.role === 'ADMIN' && Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now();
}
export function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return validAdminToken(session?.token) ? session : null;
  } catch { return null; }
}
export function saveSession(session) { sessionStorage.setItem(KEY, JSON.stringify(session)); }
export function clearSession() {
  sessionStorage.removeItem(KEY);
  for (const key of ['accessToken', 'employeeId', 'name']) localStorage.removeItem(key);
}
