import { NavLink, Outlet } from 'react-router-dom';
import { Users, FileSpreadsheet, Megaphone, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
const links = [
  { to: '/users', label: '사용자 관리', icon: Users },
  { to: '/settlement', label: '정산 엑셀 업로드', icon: FileSpreadsheet },
  { to: '/notices', label: '공지사항', icon: Megaphone },
];
export default function Layout() {
  const { user, logout } = useAuth();
  return <div className="app-shell">
    <aside className="app-sidebar">
      <div className="px-6 py-7"><h1 className="text-xl font-bold tracking-tight">Smart Ride</h1><p className="mt-1 text-xs text-slate-400">관리자 페이지</p></div>
      <nav aria-label="주 메뉴" className="flex flex-1 gap-1 px-3 md:flex-col">
        {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}><Icon size={19} aria-hidden="true" /><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-footer">
        <div className="mb-3 text-sm text-slate-300">{user?.name || '관리자'}<span className="ml-2 text-xs text-slate-500">{user?.employeeId}</span></div>
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-600" onClick={logout}><LogOut size={16} />로그아웃</button>
      </div>
    </aside>
    <main id="main-content" className="min-w-0 flex-1 overflow-auto"><Outlet /></main>
  </div>;
}
