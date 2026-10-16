import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { token, checking, sessionError, verifySession, logout } = useAuth();
  const location = useLocation();

  if (checking) return <div className="grid min-h-screen place-items-center text-slate-500" role="status">로그인 상태를 확인하고 있습니다.</div>;
  if (sessionError) return <div className="grid min-h-screen place-items-center p-6"><div className="panel max-w-md space-y-4"><p role="alert">{sessionError}</p><button className="btn-primary" onClick={() => verifySession()}>다시 시도</button><button className="btn-secondary ml-2" onClick={logout}>로그인으로</button></div></div>;
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
