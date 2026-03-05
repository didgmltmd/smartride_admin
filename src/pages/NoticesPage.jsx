import { useEffect, useState } from "react";
import {
  createMessage,
  deleteMessage,
  getMessageReads,
  getMessages,
  updateMessage,
  uploadMessageImages,
} from "../api/notices";
import { getUsers } from "../api/users";

export default function NoticesPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadDragActive, setUploadDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [unreadModalOpen, setUnreadModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [readUsers, setReadUsers] = useState([]);
  const [unreadUsers, setUnreadUsers] = useState([]);
  const [unreadLoading, setUnreadLoading] = useState(false);
  const [readTab, setReadTab] = useState("unread");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, title: "", content: "", imageUrl: "" });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadNotices() {
    setLoading(true);
    try {
      const res = await getMessages();
      setNotices(res?.data || []);
    } catch {
      setNotices([]);
      setMessage("공지사항 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotices();
  }, []);

  function onUploadDrag(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setUploadDragActive(true);
    } else if (event.type === "dragleave") {
      setUploadDragActive(false);
    }
  }

  function onUploadDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setUploadDragActive(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length === 0) return;
    setUploadFiles((prev) => [...prev, ...files]);
  }

  function onSelectUploadFiles(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setUploadFiles((prev) => [...prev, ...files]);
  }

  function removeUploadFile(index) {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setMessage("제목과 내용을 입력해 주세요.");
      return;
    }

    if (uploadFiles.length === 0) {
      setMessage("공지사항 이미지를 파일로 업로드해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const uploadRes = await uploadMessageImages(uploadFiles);
      const uploadedUrls = uploadRes?.data?.imageUrls || [];
      if (uploadedUrls.length === 0) {
        throw new Error("이미지 업로드 URL을 받지 못했습니다.");
      }

      const mergedImageUrls = [...uploadedUrls];

      await createMessage({
        title: trimmedTitle,
        content: trimmedContent,
        imageUrls: mergedImageUrls,
      });
      setTitle("");
      setContent("");
      setUploadFiles([]);
      setMessage("공지사항이 등록되었습니다.");
      await loadNotices();
    } catch (e) {
      setMessage(e?.response?.data?.message || "공지사항 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openUnreadModal(notice) {
    setSelectedNotice(notice);
    setUnreadModalOpen(true);
    setUnreadLoading(true);
    setReadTab("unread");
    setReadUsers([]);
    setUnreadUsers([]);

    try {
      const [readsRes, usersRes] = await Promise.all([getMessageReads(notice.id), getUsers()]);

      const reads = readsRes?.data || [];
      const users = usersRes?.data || [];
      const readIds = new Set(reads.map((item) => item.employeeId));
      setReadUsers(reads);

      const unread = users.filter((user) => {
        const isAdmin = user.role === "ADMIN";
        const isDeleted = !!user.deleted;
        const hasRead = readIds.has(user.employeeId);
        return !isAdmin && !isDeleted && !hasRead;
      });

      setUnreadUsers(unread);
    } catch {
      setUnreadUsers([]);
      setMessage("미확인자 목록을 불러오지 못했습니다.");
    } finally {
      setUnreadLoading(false);
    }
  }

  function closeUnreadModal() {
    setUnreadModalOpen(false);
    setSelectedNotice(null);
    setReadUsers([]);
    setUnreadUsers([]);
    setReadTab("unread");
  }

  function openEditModal(notice) {
    setEditForm({
      id: notice.id,
      title: notice.title || "",
      content: notice.content || "",
      imageUrl: notice.imageUrl || "",
    });
    setEditModalOpen(true);
  }

  function closeEditModal() {
    if (editSaving) return;
    setEditModalOpen(false);
    setEditForm({ id: null, title: "", content: "", imageUrl: "" });
  }

  async function onConfirmEdit() {
    const nextTitle = editForm.title.trim();
    const nextContent = editForm.content.trim();

    if (!nextTitle || !nextContent) {
      setMessage("수정할 제목과 내용을 입력해 주세요.");
      return;
    }

    setEditSaving(true);
    try {
      await updateMessage(editForm.id, {
        title: nextTitle,
        content: nextContent,
        imageUrl: editForm.imageUrl.trim(),
      });
      setMessage("공지사항이 수정되었습니다.");
      closeEditModal();
      await loadNotices();
    } catch (e) {
      setMessage(e?.response?.data?.message || "공지사항 수정에 실패했습니다.");
    } finally {
      setEditSaving(false);
    }
  }

  function openDeleteModal(notice) {
    setDeleteTarget(notice);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  }

  async function onConfirmDelete() {
    if (!deleteTarget?.id) return;

    setDeleteLoading(true);
    try {
      await deleteMessage(deleteTarget.id);
      setMessage("공지사항이 삭제되었습니다.");
      closeDeleteModal();
      await loadNotices();
    } catch (e) {
      setMessage(e?.response?.data?.message || "공지사항 삭제에 실패했습니다.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">공지사항 관리</h1>
        {message && <p className="mt-2 text-sm text-blue-700">{message}</p>}
      </div>

      <div className="max-w-4xl rounded-xl bg-white p-8 shadow-sm">
        <div className="space-y-6">
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-semibold text-slate-700">
              제목
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="content" className="mb-2 block text-sm font-semibold text-slate-700">
              내용
            </label>
            <div className="relative">
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용"
                rows={8}
                className="w-full resize-none rounded-lg border border-slate-200 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">이미지 업로드</label>
            <div
              onDragEnter={onUploadDrag}
              onDragOver={onUploadDrag}
              onDragLeave={onUploadDrag}
              onDrop={onUploadDrop}
              className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                uploadDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"
              }`}
            >
              <p className="text-sm text-slate-600">이미지를 드래그앤드롭 하거나 선택하세요.</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={onSelectUploadFiles}
                className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              />
            </div>

            {uploadFiles.length > 0 && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">선택된 파일</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  {uploadFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeUploadFile(index)}
                        className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                      >
                        제거
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700"
              type="button"
            >
              {submitting ? "등록 중..." : "공지 등록"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid max-w-4xl gap-4">
        {loading && (
          <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm">
            공지사항 목록을 불러오는 중입니다.
          </div>
        )}

        {!loading && notices.length === 0 && (
          <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm">
            등록된 공지사항이 없습니다.
          </div>
        )}

        {!loading &&
          notices.map((notice) => (
            <div key={notice.id} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="border-l-4 border-blue-600 pl-6">
                <h3 className="mb-3 text-lg font-bold text-slate-800">{notice.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">{notice.content}</p>
                {notice.imageUrl && (
                  <a
                    href={notice.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    이미지 보기 →
                  </a>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(notice)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    type="button"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => openDeleteModal(notice)}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    type="button"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => openUnreadModal(notice)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    type="button"
                  >
                    미확인자 조회
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {unreadModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={closeUnreadModal}>
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">미확인자 목록</h2>
              <button
                onClick={closeUnreadModal}
                className="rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700"
                type="button"
              >
                닫기
              </button>
            </div>

            {selectedNotice && (
              <p className="mb-3 text-sm text-slate-600">
                공지: <strong>{selectedNotice.title}</strong>
              </p>
            )}

            {!unreadLoading && (
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReadTab("read")}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    readTab === "read"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  확인자
                </button>
                <button
                  type="button"
                  onClick={() => setReadTab("unread")}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    readTab === "unread"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  미확인자
                </button>
              </div>
            )}

            {unreadLoading && <p className="text-sm text-slate-500">미확인자 목록을 불러오는 중입니다.</p>}

            {!unreadLoading && readTab === "unread" && unreadUsers.length === 0 && (
              <p className="text-sm text-slate-500">미확인자가 없습니다.</p>
            )}

            {!unreadLoading && readTab === "read" && readUsers.length === 0 && (
              <p className="text-sm text-slate-500">확인자가 없습니다.</p>
            )}

            {!unreadLoading && readTab === "unread" && unreadUsers.length > 0 && (
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">사원번호</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">이름</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unreadUsers.map((user) => (
                      <tr key={user.employeeId} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-700">{user.employeeId}</td>
                        <td className="px-4 py-2 text-slate-700">{user.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!unreadLoading && readTab === "read" && readUsers.length > 0 && (
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">사원번호</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">이름</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">확인시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readUsers.map((user) => (
                      <tr key={user.employeeId} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-700">{user.employeeId}</td>
                        <td className="px-4 py-2 text-slate-700">{user.name}</td>
                        <td className="px-4 py-2 text-slate-700">{user.readAt || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={closeEditModal}>
          <div
            className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-slate-900">공지사항 수정</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">제목</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">내용</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">이미지 URL</label>
                <input
                  type="text"
                  value={editForm.imageUrl}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={editSaving}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onConfirmEdit}
                disabled={editSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {editSaving ? "수정 중..." : "수정 확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={closeDeleteModal}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold text-slate-900">공지사항 삭제 확인</h2>
            <p className="mb-5 text-sm text-slate-600">
              <strong>{deleteTarget.title}</strong> 공지사항을 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleteLoading}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
              >
                {deleteLoading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
