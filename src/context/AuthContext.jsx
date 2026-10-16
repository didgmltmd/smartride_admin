import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loginApi } from '../api/auth';
import client from '../api/client';
import { clearSession, readSession, saveSession, tokenPayload, validAdminToken } from '../lib/session';
import { errorMessage } from '../lib/validation';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [checking, setChecking] = useState(Boolean(session));
  const [sessionError, setSessionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loginLock = useRef(false);
  const logout = useCallback(() => {
    clearSession(); setSession(null); setChecking(false); setSessionError('');
  }, []);
  const verifySession = useCallback(async (signal) => {
    if (!readSession()) { logout(); return; }
    setChecking(true); setSessionError('');
    try {
      await client.get('/admin/users', { signal });
      if (signal?.aborted) return;
    } catch (e) {
      if (signal?.aborted) return;
      if ([401,403].includes(e?.response?.status)) logout();
      else setSessionError('로그인 상태를 확인하지 못했습니다. 서버 연결을 확인하고 다시 시도해 주세요.');
    } finally { if (!signal?.aborted) setChecking(false); }
  }, [logout]);
  useEffect(() => {
    for (const key of ['accessToken', 'employeeId', 'name']) localStorage.removeItem(key);
    const controller = new AbortController();
    verifySession(controller.signal);
    window.addEventListener('smartride:session-expired', logout);
    return () => { controller.abort(); window.removeEventListener('smartride:session-expired', logout); };
  }, [verifySession, logout]);
  useEffect(() => {
    if (!session?.token) return;
    const delay = tokenPayload(session.token).exp * 1000 - Date.now();
    const timer = setTimeout(logout, Math.min(Math.max(delay, 0), 2147483647));
    return () => clearTimeout(timer);
  }, [session?.token, logout]);
  const login = useCallback(async (employeeId, password) => {
    if (loginLock.current) return false;
    loginLock.current = true; setLoading(true); setError('');
    try {
      const res = await loginApi({ employeeId: employeeId.trim(), password });
      const token = res?.data?.accessToken;
      if (!validAdminToken(token)) throw new Error('유효한 관리자 계정으로 로그인해 주세요.');
      const next = { token, user: { employeeId: res.data.employeeId, name: res.data.name, role: 'ADMIN' } };
      saveSession(next); setSession(next); setSessionError('');
      return true;
    } catch (e) { setError(errorMessage(e, '로그인에 실패했습니다.')); return false; }
    finally { loginLock.current = false; setLoading(false); }
  }, []);
  const value = useMemo(() => ({ token: session?.token, user: session?.user, checking, sessionError, verifySession, loading, error, login, logout }),
    [session, checking, sessionError, verifySession, loading, error, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider 내부에서 useAuth를 사용해야 합니다.');
  return context;
}
