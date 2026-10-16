import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, RotateCcw, Plus } from 'lucide-react';
import { createUser, deleteUser, getRetiredUsers, getUsers, restoreUser, updateUserPassword } from '../api/users';
import Modal from '../components/Modal';
import Feedback from '../components/Feedback';
import PeopleList from '../components/PeopleList';
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
    {feedback?.type === 'error' && users.length === 0 ? <button className="btn-secondary mt-3" onClick={load}>다시 불러오기</button> : <PeopleList users={users} loading={loading} label="퇴사자" emptyMessage="퇴사 처리된 사용자가 없습니다." columns={[
      { key: 'deletedAt', label: '퇴사 처리일', render: (user) => formatDate(user.deletedAt) },
      { key: 'actions', label: '계정 복구', render: (user) => <button className="btn-secondary btn-small" disabled={action.busy} onClick={() => restore(user)}>{restoring === user.employeeId ? '복구 중…' : '퇴사 취소'}</button> },
    ]} />}
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
  const [createOpen, setCreateOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({});
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

  function changeField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: '' }));
  }
  async function submit(event) {
    event.preventDefault();
    const employeeId = form.employeeId.trim();
    const name = form.name.trim();
    const errors = { employeeId: employeeId ? '' : '사원번호를 입력해 주세요.', name: name ? '' : '이름을 입력해 주세요.', password: validatePassword(form.password) };
    setFormErrors(errors);
    const firstError = Object.keys(errors).find((key) => errors[key]);
    if (firstError) { event.currentTarget.elements.namedItem(firstError)?.focus(); return; }
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
      <button type="button" className="disclosure-button" aria-expanded={createOpen} aria-controls="create-user-form" disabled={create.busy} onClick={() => setCreateOpen(!createOpen)}><span className="flex items-center gap-3"><span className="section-icon"><Plus size={19} /></span><span><strong>기사 계정 추가</strong><small>신규 기사의 사원번호와 초기 비밀번호를 등록합니다.</small></span></span><ChevronDown size={18} className={createOpen ? 'rotate-180' : ''} /></button>
      <form id="create-user-form" hidden={!createOpen} noValidate onSubmit={submit} className="mt-5 border-t border-slate-100 pt-5">
        <fieldset disabled={create.busy}><legend className="sr-only">기사 계정 추가</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {[['employeeId', '사원번호', '예: 1605'], ['name', '이름', '기사 이름'], ['password', '초기 비밀번호', '10~128자 입력']].map(([key, label, placeholder]) => <div key={key}><label className="field-label" htmlFor={`create-${key}`}>{label}</label><input id={`create-${key}`} name={key} className="field mt-2" type={key === 'password' ? 'password' : 'text'} value={form[key]} onChange={(e) => changeField(key, e.target.value)} placeholder={placeholder} maxLength={key === 'password' ? 128 : key === 'name' ? 100 : 50} autoComplete={key === 'password' ? 'new-password' : 'off'} required aria-invalid={Boolean(formErrors[key])} aria-describedby={formErrors[key] ? `create-${key}-error` : key === 'password' ? 'password-hint' : undefined} />{formErrors[key] && <p id={`create-${key}-error`} className="field-error">{formErrors[key]}</p>}</div>)}
          </div>
          <div className="form-footer"><p id="password-hint">모든 항목은 필수입니다. 초기 비밀번호를 기사님께 전달해 주세요.</p><button className="btn-primary" disabled={create.busy}><Plus size={16} />{create.busy ? '생성 중…' : '사용자 생성'}</button></div>
        </fieldset>
      </form>
    </section>
    <section className="panel p-0">
      <div className="list-heading"><h2>기사 목록 <span className="count-badge">{loading || loadError ? '—' : users.length}</span></h2><button className="btn-secondary btn-small" disabled={loading} onClick={load}><RotateCcw size={14} />새로고침</button></div>
      {loadError ? <div className="p-6"><Feedback value={{ type: 'error', text: loadError }} /><button className="btn-secondary mt-3" onClick={load}>다시 불러오기</button></div> : <PeopleList users={users} loading={loading} columns={[
        { key: 'status', label: '재직 상태', render: () => <span className="status-badge">재직</span> },
        { key: 'actions', label: '계정 관리', render: (user) => <div className="flex gap-2"><button className="btn-secondary btn-small" onClick={() => setPasswordUser(user)}>비밀번호 변경</button><button className="btn-danger-soft btn-small" onClick={() => { setDeleteError(null); setDeleteTarget(user); }}>퇴사 처리</button></div> },
      ]} />}
    </section>
    {passwordUser && <PasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} onSaved={() => { setPasswordUser(null); setFeedback({ type: 'success', text: '비밀번호가 변경되었습니다.' }); }} />}
    {deleteTarget && <Modal title="퇴사 처리" busy={remove.busy} onClose={() => setDeleteTarget(null)}><p className="text-sm leading-6 text-slate-600"><strong>{deleteTarget.name}</strong> ({deleteTarget.employeeId})님을 퇴사 처리하시겠습니까?<br />퇴사자 관리에서 다시 복구할 수 있습니다.</p><Feedback value={deleteError} /><div className="modal-actions"><button className="btn-secondary" disabled={remove.busy} onClick={() => setDeleteTarget(null)}>취소</button><button className="btn-danger" disabled={remove.busy} onClick={confirmDelete}>{remove.busy ? '처리 중…' : '퇴사 처리'}</button></div></Modal>}
    {retiredOpen && <RetiredModal onClose={() => setRetiredOpen(false)} onRestored={load} />}
  </div>;
}
