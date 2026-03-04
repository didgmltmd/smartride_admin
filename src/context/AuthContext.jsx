import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { loginApi } from "../api/auth";

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("accessToken"));
  const [user, setUser] = useState({
    employeeId: localStorage.getItem("employeeId"),
    name: localStorage.getItem("name"),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = useCallback(async (employeeId, password) => {
    setLoading(true);
    setError("");
    try {
      const res = await loginApi({ employeeId, password });
      const accessToken = res?.data?.accessToken;
      if (!accessToken) {
        throw new Error("로그인 토큰이 응답에 없습니다.");
      }

      const payload = parseJwt(accessToken);
      if (payload?.role !== "ADMIN") {
        throw new Error("관리자 계정만 로그인할 수 있습니다.");
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("employeeId", res?.data?.employeeId || employeeId);
      localStorage.setItem("name", res?.data?.name || "관리자");

      setToken(accessToken);
      setUser({
        employeeId: res?.data?.employeeId || employeeId,
        name: res?.data?.name || "관리자",
      });

      return true;
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "로그인에 실패했습니다.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("employeeId");
    localStorage.removeItem("name");
    setToken(null);
    setUser({ employeeId: null, name: null });
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, error, login, logout }),
    [token, user, loading, error, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("AuthProvider 내부에서 useAuth를 사용해야 합니다.");
  }
  return ctx;
}
