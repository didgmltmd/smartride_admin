import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

export default function PeopleList({ users, columns = [], emptyMessage = '조회된 사용자가 없습니다.', label = '기사', loading = false }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('employeeId');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(15);
  const table = useRef(null);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return users.filter((user) => `${user.employeeId} ${user.name}`.toLocaleLowerCase().includes(term))
      .sort((a, b) => String(a[sort] ?? '').localeCompare(String(b[sort] ?? ''), 'ko', { numeric: true }));
  }, [users, query, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const rows = filtered.slice(start, start + size);
  useEffect(() => { if (table.current) table.current.scrollTop = 0; }, [current, query, sort, size]);
  return <div className="people-list">
    <div className="directory-toolbar">
      <div className="search-field"><Search size={18} aria-hidden="true" /><input className="field" aria-label={`${label} 사원번호 또는 이름 검색`} placeholder="사원번호 또는 이름으로 찾기" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />{query && <button type="button" className="icon-button" aria-label="검색어 지우기" onClick={() => { setQuery(''); setPage(1); }}><X size={16} /></button>}</div>
      <select className="field directory-sort" aria-label={`${label} 정렬`} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}><option value="employeeId">사원번호순</option><option value="name">이름순</option></select>
    </div>
    <div className="directory-summary" role="status">{loading ? '목록을 불러오는 중…' : query.trim() ? <>검색 결과 <strong>{filtered.length}명</strong><span> / 전체 {users.length}명</span></> : <>전체 <strong>{users.length}명</strong></>}</div>
    <div ref={table} className="table-scroll directory-table" tabIndex={0} role="region" aria-label={`${label} 목록`}>
      <table className="data-table"><thead><tr><th scope="col">사원번호</th><th scope="col">이름</th>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead><tbody>
        {loading ? <tr><td colSpan={2 + columns.length} className="empty-state">사용자 목록을 불러오고 있습니다.</td></tr> : rows.length === 0 ? <tr><td colSpan={2 + columns.length} className="empty-state">{query.trim() ? '검색 결과가 없습니다. 이름이나 사원번호를 다시 확인해 주세요.' : emptyMessage}</td></tr> : rows.map((user) => <tr key={user.employeeId}><td className="employee-id">{user.employeeId}</td><td><span className="person-name">{user.name || '이름 없음'}</span></td>{columns.map((column) => <td key={column.key}>{column.render(user)}</td>)}</tr>)}
      </tbody></table>
    </div>
    <div className="directory-pagination">
      <label className="flex items-center gap-2 text-xs text-slate-500"><span className="sr-only">페이지당 인원</span><select aria-label={`${label} 페이지당 인원`} value={size} disabled={loading} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}><option value={15}>15명씩</option><option value={30}>30명씩</option><option value={50}>50명씩</option></select><span>{!loading && filtered.length > 0 ? `${start + 1}–${Math.min(start + size, filtered.length)} / ${filtered.length}명` : '—'}</span></label>
      <div className="flex items-center gap-2"><button type="button" className="btn-secondary btn-small" aria-label="이전 페이지" disabled={loading || current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={16} /></button><span className="page-count" aria-live="polite">{current} / {pages}</span><button type="button" className="btn-secondary btn-small" aria-label="다음 페이지" disabled={loading || current === pages} onClick={() => setPage(current + 1)}><ChevronRight size={16} /></button></div>
    </div>
  </div>;
}
