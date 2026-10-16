import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { uploadSettlement } from '../api/settlement';
import Feedback from '../components/Feedback';
import { validateExcel, errorMessage } from '../lib/validation';
import { useTask } from '../hooks/useTask';
export default function SettlementPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const input = useRef(null);
  const upload = useTask();
  function selectFile(next) {
    if (upload.busy) return;
    const error = validateExcel(next);
    if (error) { setFeedback({ type: 'error', text: error }); return; }
    setFile(next); setFeedback(null);
  }
  async function submit() {
    const error = validateExcel(file);
    if (error) { setFeedback({ type: 'error', text: error }); return; }
    await upload.run(async () => {
      setFeedback(null);
      try {
        const res = await uploadSettlement(file);
        setFeedback({ type: 'success', text: res?.message || '정산 엑셀 업로드가 완료되었습니다.' });
        setFile(null); if (input.current) input.current.value = '';
      } catch (e) { setFeedback({ type: 'error', text: errorMessage(e) }); }
    });
  }
  return <div className="page">
    <header className="page-header"><h1>정산 엑셀 업로드</h1><p>기사의 정산 자료를 엑셀 파일로 등록합니다.</p></header>
    <section className="panel max-w-4xl">
      <div className={`upload-zone py-12 ${dragActive ? 'upload-zone-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!upload.busy) setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files.length !== 1) { setFeedback({ type: 'error', text: '엑셀 파일을 하나씩 선택해 주세요.' }); return; } selectFile(e.dataTransfer.files[0]); }}>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Upload size={26} aria-hidden="true" /></div>
        <p className="font-medium text-slate-700">파일을 여기에 끌어다 놓으세요.</p>
        <p className="mt-2 text-sm text-slate-400">.xlsx 파일 · 최대 10MB</p>
        <input ref={input} type="file" accept=".xlsx" className="hidden" onChange={(e) => { if (e.target.files[0]) selectFile(e.target.files[0]); e.target.value = ''; }} disabled={upload.busy} />
        <button className="btn-secondary mt-5" disabled={upload.busy} onClick={() => input.current?.click()}>파일 선택</button>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">기존 양식의 ‘콜분석자료’와 ‘카드수입금자료’ 시트, 정산 월을 확인해 주세요.</p>
      {file && <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"><FileSpreadsheet size={22} className="text-emerald-600" /><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span><span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)}KB</span><button className="icon-button" aria-label="선택한 파일 제거" disabled={upload.busy} onClick={() => setFile(null)}><X size={18} /></button></div>}
      <Feedback value={feedback} />
      <div className="mt-6 flex justify-end"><button className="btn-primary" disabled={!file || upload.busy} onClick={submit}>{upload.busy ? '업로드 중…' : '정산 자료 업로드'}</button></div>
    </section>
  </div>;
}
