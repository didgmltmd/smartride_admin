import { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { createUser, deleteUser, getUsers, updateUserPassword } from "../api/users";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "desc" });

  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await getUsers();
      const list = res?.data || [];
      setUsers(list.filter((user) => user.role !== "ADMIN"));
    } catch {
      setError("사용자 목록을 불러오지 못했습니다.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function applyFilters() {
    setAppliedSearchTerm(searchTerm.trim());
  }

  function resetFilters() {
    setSearchTerm("");
    setAppliedSearchTerm("");
  }

  function onSearchKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      applyFilters();
    }
  }

  async function onCreateDriver() {
    const employeeId = newEmployeeId.trim();
    const name = newName.trim();
    const password = newPassword.trim();

    if (!employeeId || !name || !password) {
      setMessage("사원번호, 이름, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    try {
      await createUser({
        employeeId,
        name,
        password,
        role: "DRIVER",
      });
      setMessage("기사가 추가되었습니다.");
      setNewEmployeeId("");
      setNewName("");
      setNewPassword("");
      await loadUsers();
    } catch (e) {
      setMessage(e?.response?.data?.message || "기사 추가에 실패했습니다.");
    }
  }

  async function onChangePassword(employeeId) {
    const password = window.prompt("새 비밀번호를 입력하세요");
    if (!password) return;

    try {
      await updateUserPassword(employeeId, password);
      setMessage("비밀번호가 변경되었습니다.");
      await loadUsers();
    } catch (e) {
      setMessage(e?.response?.data?.message || "비밀번호 변경에 실패했습니다.");
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget?.employeeId) return;

    setDeleting(true);
    try {
      await deleteUser(deleteTarget.employeeId);
      setMessage("사용자가 삭제되었습니다.");
      setDeleteTarget(null);
      await loadUsers();
    } catch (e) {
      setMessage(e?.response?.data?.message || "사용자 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const search = appliedSearchTerm;
    if (!search) return users;

    return users.filter((user) => {
      const id = String(user.employeeId || "");
      const username = String(user.name || "");
      return id.includes(search) || username.includes(search);
    });
  }, [users, appliedSearchTerm]);

  function onSort(columnKey) {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === "desc" ? "asc" : "desc",
        };
      }
      return {
        key: columnKey,
        direction: "desc",
      };
    });
  }

  function sortMark(columnKey) {
    if (sortConfig.key !== columnKey) return "";
    return sortConfig.direction === "desc" ? " ▼" : " ▲";
  }

  const sortedUsers = useMemo(() => {
    if (!sortConfig.key) return filteredUsers;

    const list = [...filteredUsers];
    const order = sortConfig.direction === "desc" ? -1 : 1;

    if (sortConfig.key === "employeeId") {
      list.sort(
        (a, b) =>
          order *
          String(a.employeeId || "").localeCompare(String(b.employeeId || ""), "ko", {
            numeric: true,
            sensitivity: "base",
          })
      );
      return list;
    }

    if (sortConfig.key === "name") {
      list.sort(
        (a, b) =>
          order *
          String(a.name || "").localeCompare(String(b.name || ""), "ko", {
            sensitivity: "base",
          })
      );
      return list;
    }

    return list;
  }, [filteredUsers, sortConfig]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">사용자 관리</h1>
        {message && <p className="mt-2 text-sm text-blue-700">{message}</p>}
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="사원번호 또는 이름 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={applyFilters}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
            type="button"
          >
            검색
          </button>
          <button
            onClick={resetFilters}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-6 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-200"
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            초기화
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="사원번호"
            value={newEmployeeId}
            onChange={(e) => setNewEmployeeId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCreateDriver();
              }
            }}
            className="rounded-lg border border-slate-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCreateDriver();
              }
            }}
            className="rounded-lg border border-slate-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="비밀번호"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCreateDriver();
              }
            }}
            className="rounded-lg border border-slate-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={onCreateDriver}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
          type="button"
        >
          사용자 생성
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th
                  onClick={() => onSort("employeeId")}
                  className="cursor-pointer px-6 py-4 text-left text-sm font-semibold text-slate-700"
                >
                  사원번호{sortMark("employeeId")}
                </th>
                <th
                  onClick={() => onSort("name")}
                  className="cursor-pointer px-6 py-4 text-left text-sm font-semibold text-slate-700"
                >
                  이름{sortMark("name")}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">권한</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">식별 여부</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                    사용자 목록을 불러오는 중입니다.
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-rose-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && sortedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                    조회된 사용자가 없습니다.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                sortedUsers.map((user) => (
                  <tr key={user.employeeId} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">{user.employeeId}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.role}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{String(user.deleted)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onChangePassword(user.employeeId)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                          type="button"
                        >
                          비밀번호 변경
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600"
                          type="button"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => (deleting ? null : setDeleteTarget(null))}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold text-slate-900">삭제 확인</h2>
            <p className="mb-5 text-sm text-slate-600">
              <strong>{deleteTarget.name}</strong> ({deleteTarget.employeeId}) 사용자를 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-60"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
