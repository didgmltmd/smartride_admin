import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path) => {
    if (path === "/users") {
      return location.pathname === "/" || location.pathname === "/users";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-56 flex-col bg-slate-800 text-white">
        <div className="p-6">
          <h1 className="text-xl font-bold">Smart Ride</h1>
        </div>

        <nav className="flex-1 px-3">
          <Link
            to="/users"
            className={`mb-2 block rounded-lg px-4 py-3 transition-colors ${
              isActive("/users")
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            사용자 관리
          </Link>
          <Link
            to="/settlement"
            className={`mb-2 block rounded-lg px-4 py-3 transition-colors ${
              isActive("/settlement")
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            정산 액셀 업로드
          </Link>
          <Link
            to="/notices"
            className={`mb-2 block rounded-lg px-4 py-3 transition-colors ${
              isActive("/notices")
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            공지사항
          </Link>
        </nav>

        <div className="border-t border-slate-700 p-4">
          <div className="mb-2 text-sm text-slate-400">관리자</div>
          <button
            onClick={logout}
            className="w-full cursor-pointer rounded-lg bg-rose-500 px-4 py-2 text-white transition-colors hover:bg-rose-600"
            type="button"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
