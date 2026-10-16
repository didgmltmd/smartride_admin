import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RotateCcw, Plus } from 'lucide-react';
import { createUser, deleteUser, getRetiredUsers, getUsers, restoreUser, updateUserPassword } from '../api/users';
import Modal from '../components/Modal';
import Feedback from '../components/Feedback';
import { useTask } from '../hooks/useTask';
import { errorMessage, validatePassword } from '../lib/validation';

function PasswordModal({ user, onClose, onSaved }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const action = useTask();
  async function submit(event) {
    event.preventDefault();
    const error = validatePassword(password) || (password !== confirmation ? '비밀번호가 일치하지 않습니다.' : '');
    if (error) { setFeedback({ type: 'error', text: error }); return; }
    await action.run(async () => {
      try { await updateUserPassword(user.employeeId, password); onSaved(); }
      catch (e) { setFeedback({ type: 'error', text: errorMessage(e) }); }
    });
  }
  return <Modal title="비밀번호 변경" busy={action.busy} onClose={onClose}>
    <p className="mb-5 text-sm text-slate-500">{user.name} ({user.employeeId})님의 새 비밀번호를 입력해 주세요.</p>
    <form onSubmit={submit}>
      <fieldset disabled={action.busy} className="space-y-4">
        <label className="field-label">새 비밀번호<input data-initial-focus type="password" autoComplete="new-password" className="field mt-2" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} maxLength={128} required /></label>
        <p className="text-xs text-slate-400">10~128자로 입력해 주세요.</p>
        <label className="field-label">새 비밀번호 확인<input type="password" autoComplete="new-password" className="field mt-2" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></label>
      </fieldset>
      <Feedback value={feedback} />
      <div className="modal-actions"><button type="button" className="btn-secondary" disabled={action.busy} onClick={onClose}>취소</button><button className="btn-primary" disabled={action.busy}>{action.busy ? '변경 중…' : '비밀번호 변경'}</button></div>
    </form>
  </Modal>;
}

function RetiredModal({ onClose, onRestored }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [restoring, setRestoring] = useState('');
  const action = useTask();
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setFeedback(null);
    try { const res = await getRetiredUsers(); if (id === request.current) setUsers(res?.data || []); }
    catch (e) { if (id === request.current) setFeedback({ type: 'error', text: errorMessage(e) }); }
    finally { if (id === request.current) setLoading(false); }
  }, []);
  const invalidate = useCallback(() => { request.current += 1; }, []);
  useEffect(() => { load(); return invalidate; }, [load, invalidate]);
  async function restore(user) {
    await action.run(async () => {
      setRestoring(user.employeeId);
      try {
        await restoreUser(user.employeeId);
        setUsers((list) => list.filter((item) => item.employeeId !== user.employeeId));
        setFeedback({ type: 'success', text: `${user.name}님의 퇴사 처리를 취소했습니다.` });
        onRestored();
      } catch (e) { setFeedback({ type: 'error', text: errorMessage(e) }); }
      finally { setRestoring(''); }
    });
  }
  return <Modal title="퇴사자 관리" wide onClose={onClose} busy={action.busy}>
    <p className="mb-4 text-sm text-slate-500">퇴사 처리된 사용자를 확인하고 복구할 수 있습니다.</p>
    <Feedback value={feedback} />
    {loading ? <p className="empty-state" role="status">퇴사자 목록을 불러오고 있습니다.</p> : feedback?.type === 'error' && users.length === 0 ? <button className="btn-secondary mt-3" onClick={load}>다시 불러오기</button> : <div className="table-scroll"><table className="data-table"><thead><tr><th>사원번호</th><th>이름</th><th>퇴사 처리일</th><th>작업</th></tr></thead><tbody>
      {users.length === 0 ? <tr><td colSpan={4} className="empty-state">퇴사 처리된 사용자가 없습니다.</td></tr> : users.map((user) => <tr key={user.employeeId}><td>{user.employeeId}</td><td>{user.name}</td><td>{formatDate(user.deletedAt)}</td><td><button className="btn-secondary btn-small" disabled={action.busy} onClick={() => restore(user)}>{restoring === user.employeeId ? '복구 중…' : '퇴사 취소'}</button></td></tr>)}
    </tbody></table></div>}
  </Modal>;
}
function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(date) : '-';
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sort, setSort] = useState({ key: 'employeeId', direction: 1 });
  const [form, setForm] = useState({ employeeId: '', name: '', password: '' });
  const [passwordUser, setPasswordUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [retiredOpen, setRetiredOpen] = useState(false);
  const create = useTask();
  const remove = useTask();
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setLoadError('');
    try {
      const res = await getUsers();
      if (id === request.current) setUsers((res?.data || []).filter((user) => user.role !== 'ADMIN' && !user.deleted));
    } catch (e) { if (id === request.current) setLoadError(errorMessage(e)); }
    finally { if (id === request.current) setLoading(false); }
  }, []);
  const invalidate = useCallback(() => { request.current += 1; }, []);
  useEffect(() => { load(); return invalidate; }, [load, invalidate]);

  const visible = useMemo(() => {
    const term = appliedSearch.toLocaleLowerCase();
    return users.filter((user) => `${user.employeeId} ${user.name}`.toLocaleLowerCase().includes(term))
      .sort((a,b) => sort.direction * String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''), 'ko', { numeric: true, sensitivity: 'base' }));
  }, [users, appliedSearch, sort]);
  function changeSort(key) { setSort((current) => ({ key, direction: current.key === key ? -current.direction : 1 })); }
  async function submit(event) {
    event.preventDefault();
    const employeeId = form.employeeId.trim();
    const name = form.name.trim();
    const error = !employeeId || !name ? '사원번호와 이름을 입력해 주세요.' : validatePassword(form.password);
    if (error) { setFeedback({ type: 'error', text: error }); return; }
    await create.run(async () => {
      setFeedback(null);
      try {
        await createUser({ employeeId, name, password: form.password, role: 'DRIVER' });
        setForm({ employeeId: '', name: '', password: '' });
        setFeedback({ type: 'success', text: '기사가 추가되었습니다.' });
        await load();
      } catch (e) { setFeedback({ type: 'error', text: errorMessage(e) }); }
    });
  }
  async function confirmDelete() {
    await remove.run(async () => {
      setDeleteError(null);
      try {
        await deleteUser(deleteTarget.employeeId);
        setDeleteTarget(null); setFeedback({ type: 'success', text: '퇴사 처리되었습니다. 퇴사자 관리에서 복구할 수 있습니다.' });
        await load();
      } catch (e) { setDeleteError({ type: 'error', text: errorMessage(e) }); }
    });
  }
  return <div className="page">
    <header className="page-header flex flex-wrap items-start justify-between gap-4"><div><h1>사용자 관리</h1><p>기사 계정과 재직 상태를 관리합니다.</p></div><button className="btn-secondary" onClick={() => setRetiredOpen(true)}><RotateCcw size={16} />퇴사자 관리</button></header>
    <Feedback value={feedback} />
    <section className="panel mb-6">
      <form className="mb-6 flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); setAppliedSearch(search.trim()); }}>
        <div className="relative min-w-48 flex-1"><Search size={18} className="absolute left-3.5 top-3 text-slate-400" aria-hidden="true" /><input className="field pl-10" aria-label="사원번호 또는 이름 검색" placeholder="사원번호 또는 이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <button className="btn-primary">검색</button><button type="button" className="btn-secondary" onClick={() => { setSearch(''); setAppliedSearch(''); }}><RotateCcw size={15} />초기화</button>
      </form>
      <form onSubmit={submit} className="border-t border-slate-100 pt-5">
        <fieldset disabled={create.busy}><legend className="mb-4 text-sm font-semibold text-slate-700">기사 계정 추가</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="field-label">사원번호<input className="field mt-2" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} maxLength={50} autoComplete="off" required /></label>
            <label className="field-label">이름<input className="field mt-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} autoComplete="off" required /></label>
            <label className="field-label">초기 비밀번호<input type="password" className="field mt-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="10자 이상" minLength={10} maxLength={128} autoComplete="new-password" required /></label>
          </div>
          <button className="btn-primary mt-4" disabled={create.busy}><Plus size={16} />{create.busy ? '생성 중…' : '사용자 생성'}</button>
        </fieldset>
      </form>
    </section>
    <section className="panel p-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><span className="text-sm font-semibold text-slate-700">기사 목록 <span className="ml-1 text-blue-600">{loading || loadError ? '—' : visible.length}</span></span><button className="text-sm text-slate-500 hover:text-blue-600" disabled={loading} onClick={load}>새로고침</button></div>
      {loadError ? <div className="p-6"><Feedback value={{ type: 'error', text: loadError }} /><button className="btn-secondary mt-3" onClick={load}>다시 불러오기</button></div> : <div className="table-scroll"><table className="data-table"><thead><tr>
        {['employeeId','name'].map((key) => <th key={key} aria-sort={sort.key === key ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}><button onClick={() => changeSort(key)}>{key === 'employeeId' ? '사원번호' : '이름'}{sort.key === key ? (sort.direction === 1 ? ' ↑' : ' ↓') : ''}</button></th>)}
        <th>권한</th><th>재직 상태</th><th>작업</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={5} className="empty-state" role="status">사용자 목록을 불러오고 있습니다.</td></tr> : visible.length === 0 ? <tr><td colSpan={5} className="empty-state">조회된 사용자가 없습니다.</td></tr> : visible.map((user) => <tr key={user.employeeId}><td>{user.employeeId}</td><td className="font-medium text-slate-800">{user.name}</td><td>기사</td><td><span className="status-badge">재직</span></td><td><div className="flex gap-2"><button className="btn-secondary btn-small" onClick={() => setPasswordUser(user)}>비밀번호 변경</button><button className="btn-danger-soft btn-small" onClick={() => { setDeleteError(null); setDeleteTarget(user); }}>퇴사 처리</button></div></td></tr>)}
      </tbody></table></div>}
    </section>
    {passwordUser && <PasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} onSaved={() => { setPasswordUser(null); setFeedback({ type: 'success', text: '비밀번호가 변경되었습니다.' }); }} />}
    {deleteTarget && <Modal title="퇴사 처리" busy={remove.busy} onClose={() => setDeleteTarget(null)}><p className="text-sm leading-6 text-slate-600"><strong>{deleteTarget.name}</strong> ({deleteTarget.employeeId})님을 퇴사 처리하시겠습니까?<br />퇴사자 관리에서 다시 복구할 수 있습니다.</p><Feedback value={deleteError} /><div className="modal-actions"><button className="btn-secondary" disabled={remove.busy} onClick={() => setDeleteTarget(null)}>취소</button><button className="btn-danger" disabled={remove.busy} onClick={confirmDelete}>{remove.busy ? '처리 중…' : '퇴사 처리'}</button></div></Modal>}
    {retiredOpen && <RetiredModal onClose={() => setRetiredOpen(false)} onRestored={load} />}
  </div>;
}
