import { useCallback, useEffect, useRef, useState } from 'react';
import { getMessages, deleteMessage } from '../api/notices';
import Modal from '../components/Modal';
import Feedback from '../components/Feedback';
import NoticeEditor, { noticeImages } from '../components/NoticeEditor';
import NoticeReadsModal from '../components/NoticeReadsModal';
import { errorMessage } from '../lib/validation';
import { useTask } from '../hooks/useTask';

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [edit, setEdit] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [reads, setReads] = useState(null);
  const [target, setTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const remove = useTask();
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setLoadError('');
    try { const res = await getMessages(); if (id === request.current) setNotices(res?.data || []); }
    catch (e) { if (id === request.current) setLoadError(errorMessage(e)); }
    finally { if (id === request.current) setLoading(false); }
  }, []);
  const invalidate = useCallback(() => { request.current += 1; }, []);
  useEffect(() => { load(); return invalidate; }, [load, invalidate]);
  function saved(wasEdit) {
    setEdit(null);
    setFeedback({ type: 'success', text: wasEdit ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.' });
    load();
  }
  async function confirmDelete() {
    await remove.run(async () => {
      setDeleteError(null);
      try { await deleteMessage(target.id); setTarget(null); setFeedback({ type: 'success', text: '공지사항이 삭제되었습니다.' }); await load(); }
      catch (e) { setDeleteError({ type: 'error', text: errorMessage(e) }); }
    });
  }
  return <div className="page">
    <header className="page-header"><h1>공지사항 관리</h1><p>기사님들에게 소식을 전하고 확인 현황을 살펴보세요.</p></header>
    <div className="max-w-4xl">
      <Feedback value={feedback} />
      <section className="panel"><h2 className="mb-5 text-base font-semibold text-slate-800">새 공지 작성</h2><NoticeEditor onSaved={() => saved(false)} /></section>
      <div className="mb-4 mt-8 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-700">등록된 공지</h2><button className="text-sm text-slate-500 hover:text-blue-600" disabled={loading} onClick={load}>새로고침</button></div>
      {loading ? <div className="panel empty-state" role="status">공지사항을 불러오고 있습니다.</div> : loadError ? <div className="panel"><Feedback value={{ type: 'error', text: loadError }} /><button className="btn-secondary mt-3" onClick={load}>다시 불러오기</button></div> : notices.length === 0 ? <div className="panel empty-state">아직 등록된 공지사항이 없습니다.</div> : <div className="space-y-4">{notices.map((notice) => <article key={notice.id} className="panel">
        <div className="border-l-4 border-blue-500 pl-5"><h3 className="mb-3 break-words text-lg font-semibold text-slate-800">{notice.title}</h3><p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{notice.content}</p>
          {noticeImages(notice).length > 0 && <div className="mt-4 flex flex-wrap gap-3">{noticeImages(notice).map((url,index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100">이미지 {index + 1} 보기</a>)}</div>}
          <div className="mt-5 flex flex-wrap gap-2"><button className="btn-secondary btn-small" onClick={() => setEdit(notice)}>수정</button><button className="btn-danger-soft btn-small" onClick={() => { setDeleteError(null); setTarget(notice); }}>삭제</button><button className="btn-primary btn-small ml-auto" onClick={() => setReads(notice)}>확인 현황</button></div>
        </div>
      </article>)}</div>}
    </div>
    {reads && <NoticeReadsModal key={reads.id} notice={reads} onClose={() => setReads(null)} />}
    {edit && <Modal title="공지사항 수정" busy={editBusy} wide onClose={() => setEdit(null)}><NoticeEditor key={edit.id} notice={edit} onBusyChange={setEditBusy} onSaved={() => saved(true)} onCancel={() => setEdit(null)} /></Modal>}
    {target && <Modal title="공지사항 삭제" busy={remove.busy} onClose={() => setTarget(null)}><p className="text-sm leading-6 text-slate-600"><strong>{target.title}</strong> 공지사항을 삭제하시겠습니까?<br />삭제한 공지는 복구할 수 없습니다.</p><Feedback value={deleteError} /><div className="modal-actions"><button className="btn-secondary" disabled={remove.busy} onClick={() => setTarget(null)}>취소</button><button className="btn-danger" disabled={remove.busy} onClick={confirmDelete}>{remove.busy ? '삭제 중…' : '삭제'}</button></div></Modal>}
  </div>;
}
