import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X, Check } from 'lucide-react';
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
      <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-800">정산 파일 등록</h2><span className={file ? 'status-badge' : 'text-xs text-slate-500'}>{upload.busy ? '업로드 중' : file ? '파일 선택 완료' : '파일을 선택해 주세요'}</span></div>
      <div className={`upload-zone settlement-upload ${file ? 'has-file' : ''} ${dragActive ? 'upload-zone-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!upload.busy) setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files.length !== 1) { setFeedback({ type: 'error', text: '엑셀 파일을 하나씩 선택해 주세요.' }); return; } selectFile(e.dataTransfer.files[0]); }}>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">{file ? <FileSpreadsheet size={26} aria-hidden="true" /> : <Upload size={26} aria-hidden="true" />}</div>
        <p className="break-all font-medium text-slate-700">{file ? file.name : '정산 엑셀 파일을 끌어다 놓으세요.'}</p>
        <p className="mt-2 text-sm text-slate-500">{file ? `${(file.size / 1024).toFixed(0)}KB · 업로드할 파일을 확인해 주세요.` : '.xlsx 파일 1개 · 최대 10MB'}</p>
        <input ref={input} type="file" accept=".xlsx" className="hidden" onChange={(e) => { if (e.target.files[0]) selectFile(e.target.files[0]); e.target.value = ''; }} disabled={upload.busy} />
        <div className="mt-5 flex justify-center gap-2"><button className="btn-secondary" disabled={upload.busy} onClick={() => input.current?.click()}>{file ? '다른 파일 선택' : '파일 선택'}</button>{file && <button className="icon-button" aria-label="선택한 파일 제거" disabled={upload.busy} onClick={() => setFile(null)}><X size={18} /></button>}</div>
      </div>
      <div className="upload-guide"><h3>업로드 전 확인해 주세요</h3><ul><li><Check size={15} aria-hidden="true" />기존 양식의 ‘콜분석자료’와 ‘카드수입금자료’ 시트를 포함해 주세요.</li><li><Check size={15} aria-hidden="true" />엑셀에 입력된 정산 월과 기사별 자료를 확인해 주세요.</li></ul></div>
      <Feedback value={feedback} />
      <div className="form-footer"><p>{file ? '선택한 파일을 확인한 후 업로드해 주세요.' : '파일을 선택하면 업로드 버튼이 활성화됩니다.'}</p><button className="btn-primary" disabled={!file || upload.busy} onClick={submit}><Upload size={16} />{upload.busy ? '업로드 중…' : '정산 자료 업로드'}</button></div>
    </section>
  </div>;
}
