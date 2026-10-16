import { useId, useRef, useState } from 'react';
import { createMessage, updateMessage, uploadMessageImages } from '../api/notices';
import ImagePicker from './ImagePicker';
import Feedback from './Feedback';
import { useTask } from '../hooks/useTask';
import { errorMessage, validateImages } from '../lib/validation';

export function noticeImages(notice) {
  const list = Array.isArray(notice?.imageUrls) && notice.imageUrls.length ? notice.imageUrls : notice?.imageUrl ? [notice.imageUrl] : [];
  return list.filter((url) => typeof url === 'string' && /^(https?:\/\/|\/api\/)/i.test(url));
}
export default function NoticeEditor({ notice, onSaved, onCancel, onBusyChange }) {
  const titleInput = useRef(null);
  const titleErrorId = useId();
  const [titleError, setTitleError] = useState('');
  const [title, setTitle] = useState(notice?.title || '');
  const [content, setContent] = useState(notice?.content || '');
  const [images, setImages] = useState(() => noticeImages(notice));
  const [files, setFiles] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const action = useTask();
  // Keep successful uploads when saving fails, so a retry does not re-upload them.
  async function submit(event) {
    event.preventDefault();
    if (!title.trim()) { setTitleError('제목을 입력해 주세요.'); titleInput.current?.focus(); return; }
    const error = validateImages(files, images.length);
    if (error) { setFeedback({ type: 'error', text: error }); return; }
    await action.run(async () => {
      onBusyChange?.(true); setFeedback(null);
      try {
        let imageUrls = [...images];
        if (files.length) {
          const res = await uploadMessageImages(files);
          const uploaded = res?.data?.imageUrls;
          if (!Array.isArray(uploaded) || uploaded.length !== files.length) throw new Error('일부 이미지 업로드를 확인하지 못했습니다. 첨부 파일을 확인해 주세요.');
          imageUrls = [...images, ...uploaded];
          setImages(imageUrls); setFiles([]);
        }
        const payload = { title: title.trim(), content: content.trim(), imageUrls };
        if (notice) await updateMessage(notice.id, payload);
        else await createMessage(payload);
        setTitle(''); setContent(''); setImages([]); setFiles([]);
        onSaved();
      } catch (e) { setFeedback({ type: 'error', text: errorMessage(e) }); }
      finally { onBusyChange?.(false); }
    });
  }
  return <form onSubmit={submit} noValidate>
    <fieldset disabled={action.busy} className="space-y-5">
      <div><label className="field-label">제목<input ref={titleInput} data-initial-focus={notice ? '' : undefined} className="field mt-2" placeholder="공지 제목을 입력해 주세요." value={title} maxLength={200} onChange={(e) => { setTitle(e.target.value); setTitleError(''); }} required aria-invalid={Boolean(titleError)} aria-describedby={titleError ? titleErrorId : undefined} /></label>{titleError && <p id={titleErrorId} className="field-error">{titleError}</p>}</div>
      <label className="field-label">내용<textarea className="field mt-2 min-h-28 resize-y" placeholder="기사님들에게 전달할 내용을 입력해 주세요." value={content} maxLength={10000} onChange={(e) => setContent(e.target.value)} rows={4} /></label>
      {images.length > 0 && <div><p className="field-label">첨부된 이미지</p><ul className="mt-2 space-y-2">{images.map((url,index) => <li key={url} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline-offset-4 hover:underline">이미지 {index + 1} 보기</a><button type="button" className="btn-secondary btn-small" onClick={() => setImages(images.filter((_,i) => i !== index))}>제거</button></li>)}</ul></div>}
      <ImagePicker files={files} onChange={(next) => { setFiles(next); setFeedback(null); }} existingCount={images.length} disabled={action.busy} onError={(text) => setFeedback({ type: 'error', text })} />
    </fieldset>
    <Feedback value={feedback} />
    <div className="modal-actions">{onCancel && <button type="button" className="btn-secondary" disabled={action.busy} onClick={onCancel}>취소</button>}<button className="btn-primary" disabled={action.busy}>{action.busy ? '저장 중…' : notice ? '수정 저장' : '공지 등록'}</button></div>
  </form>;
}
