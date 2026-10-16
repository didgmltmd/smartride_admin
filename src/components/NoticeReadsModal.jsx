import { useEffect, useState } from 'react';
import { getMessageReads } from '../api/notices';
import { getUsers } from '../api/users';
import Modal from './Modal';
import Feedback from './Feedback';
import { errorMessage } from '../lib/validation';
import PeopleList from './PeopleList';

export default function NoticeReadsModal({ notice, onClose }) {
  const [tab, setTab] = useState('unread');
  const [state, setState] = useState({ loading: true, error: '', read: [], unread: [] });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: '', read: [], unread: [] });
    Promise.all([getMessageReads(notice.id, controller.signal), getUsers(controller.signal)])
      .then(([readsRes, usersRes]) => {
        if (controller.signal.aborted) return;
        const read = readsRes?.data || [];
        const readIds = new Set(read.map((item) => String(item.employeeId)));
        const unread = (usersRes?.data || []).filter((user) => user.role !== 'ADMIN' && !user.deleted && !readIds.has(String(user.employeeId)));
        setState({ loading: false, error: '', read, unread });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ loading: false, error: errorMessage(error), read: [], unread: [] });
      });
    return () => controller.abort();
  }, [notice.id, retry]);
  const total = state.read.length + state.unread.length;
  const rate = total ? Math.round(state.read.length / total * 100) : 0;
  return <Modal title="공지 확인 현황" wide onClose={onClose}>
    <p className="notice-context">{notice.title}</p>
    {state.loading ? <p className="empty-state" role="status">확인 현황을 불러오고 있습니다.</p> : state.error ? <><Feedback value={{ type: 'error', text: state.error }} /><button className="btn-secondary mt-3" onClick={() => setRetry((n) => n + 1)}>다시 불러오기</button></> : <>
      <div className="read-progress"><div><span>공지 확인률</span><strong>{rate}% <small>({state.read.length} / {total}명)</small></strong></div><progress value={state.read.length} max={total || 1} aria-label="공지 확인률" /></div>
      <div className="segmented-control" aria-label="확인 상태 필터">{[['unread','미확인자'], ['read','확인자']].map(([key,label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{label} <span>{state[key].length}</span></button>)}</div>
      <PeopleList key={tab} users={state[tab]} label={tab === 'unread' ? '미확인자' : '확인자'} emptyMessage={tab === 'unread' ? '미확인자가 없습니다.' : '아직 확인한 사용자가 없습니다.'} columns={tab === 'read' ? [{ key: 'readAt', label: '확인 시간', render: (user) => user.readAt ? new Date(user.readAt).toLocaleString('ko-KR') : '-' }] : []} />
    </>}
  </Modal>;
}
