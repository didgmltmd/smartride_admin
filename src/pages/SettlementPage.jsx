import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { uploadSettlement } from "../api/settlement";

export default function SettlementPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setMessage(`선택된 파일: ${file.name}`);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setMessage(`선택된 파일: ${file.name}`);
    }
  };

  async function handleUpload() {
    if (!selectedFile) {
      setMessage("업로드할 엑셀 파일을 먼저 선택해 주세요.");
      return;
    }

    setUploading(true);
    setMessage("업로드 중입니다...");

    try {
      const res = await uploadSettlement(selectedFile);
      setMessage(res?.message || "엑셀 업로드가 완료되었습니다.");
    } catch (e) {
      setMessage(e?.response?.data?.message || "엑셀 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">정산 액셀 업로드</h1>
      </div>

      <div className="mb-6 rounded-xl bg-white p-8 shadow-sm">
        <div
          className={`rounded-xl border-2 border-dashed p-12 text-center transition-all ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="mb-2 text-lg font-medium text-slate-800">파일을 여기에 끌어다 놓으세요.</p>
              <p className="text-sm text-slate-500">또는 클릭해서 엑셀 파일을 선택하세요.</p>
              {selectedFile && <p className="mt-2 text-sm text-slate-600">{selectedFile.name}</p>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={uploading}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              type="button"
            >
              {uploading ? "업로드 중..." : "업로드"}
            </button>
          </div>
        </div>

        {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
      </div>
    </div>
  );
}
