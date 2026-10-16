import { useId, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { validateImages } from '../lib/validation';
export default function ImagePicker({ files, onChange, existingCount = 0, disabled = false, onError }) {
  const id = useId();
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  function addFiles(selected) {
    if (disabled) return;
    const next = [...files];
    for (const file of selected) {
      if (!next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) next.push(file);
    }
    const error = validateImages(next, existingCount);
    if (error) onError(error);
    else onChange(next);
    if (input.current) input.current.value = '';
  }
  return <div>
    <label htmlFor={id} className="field-label">이미지 첨부 <span className="font-normal text-slate-400">(선택)</span></label>
    <div className={`upload-zone image-upload ${dragging ? 'upload-zone-active' : ''}`}
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}>
      <ImagePlus size={24} className="shrink-0 text-slate-400" aria-hidden="true" />
      <div className="flex-1"><p className="mb-1 text-sm text-slate-600">이미지를 끌어다 놓으세요.</p><p className="text-xs text-slate-500">JPG, PNG, WEBP · 파일당 5MB · {existingCount + files.length}/5개</p></div>
      <input id={id} ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled}
        className="sr-only"
        onChange={(event) => addFiles(Array.from(event.target.files))} />
      <button type="button" className="btn-secondary btn-small" disabled={disabled} onClick={() => input.current?.click()}>이미지 선택</button>
    </div>
    {files.length > 0 && <ul className="mt-3 space-y-2">
      {files.map((file, index) => <li key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="truncate">{file.name} <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(1)}MB)</span></span>
        <button type="button" className="icon-button" disabled={disabled} aria-label={`${file.name} 제거`} onClick={() => onChange(files.filter((_, i) => i !== index))}><X size={16} /></button>
      </li>)}
    </ul>}
  </div>;
}
