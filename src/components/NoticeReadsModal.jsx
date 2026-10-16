import { useEffect, useState } from 'react';
import { getMessageReads } from '../api/notices';
import { getUsers } from '../api/users';
import Modal from './Modal';
import Feedback from './Feedback';
import { errorMessage } from '../lib/validation';

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
  const rows = state[tab];
  return <Modal title="공지 확인 현황" wide onClose={onClose}>
    <p className="mb-5 text-sm text-slate-500">{notice.title}</p>
    {state.loading ? <p className="empty-state" role="status">확인 현황을 불러오고 있습니다.</p> : state.error ? <><Feedback value={{ type: 'error', text: state.error }} /><button className="btn-secondary mt-3" onClick={() => setRetry((n) => n + 1)}>다시 불러오기</button></> : <>
      <div className="mb-4 flex gap-2" aria-label="확인 상태 필터">{[['unread','미확인자'], ['read','확인자']].map(([key,label]) => <button key={key} type="button" aria-pressed={tab === key} className={tab === key ? 'btn-primary btn-small' : 'btn-secondary btn-small'} onClick={() => setTab(key)}>{label} {state[key].length}</button>)}</div>
      {rows.length === 0 ? <p className="empty-state">{tab === 'unread' ? '미확인자가 없습니다.' : '아직 확인한 사용자가 없습니다.'}</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>사원번호</th><th>이름</th>{tab === 'read' && <th>확인 시간</th>}</tr></thead><tbody>{rows.map((user) => <tr key={user.employeeId}><td>{user.employeeId}</td><td>{user.name}</td>{tab === 'read' && <td>{user.readAt ? new Date(user.readAt).toLocaleString('ko-KR') : '-'}</td>}</tr>)}</tbody></table></div>}
    </>}
  </Modal>;
}
