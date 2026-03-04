import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [employeeId, setEmployeeId] = useState("admin");
  const [password, setPassword] = useState("admin");
  const navigate = useNavigate();

  async function onSubmit(event) {
    event.preventDefault();
    const ok = await login(employeeId, password);
    if (ok) navigate("/users");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">관리자 로그인</h1>

        <label htmlFor="employeeId" className="block text-sm font-semibold text-slate-700">
          사원번호
        </label>
        <input
          id="employeeId"
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-blue-500/30 focus:ring-2"
        />

        <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-blue-500/30 focus:ring-2"
        />

        {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
