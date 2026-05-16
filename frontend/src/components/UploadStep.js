import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X, AlertCircle, ChevronLeft, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useFormStore, useUploadStore, useExtractionStore } from '../store';
import { validateFile } from '../utils/helpers';
import { Button, Card, Label, Badge } from './ui';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function UploadStep({ onNext, onBack }) {
  const fields = useFormStore((s) => s.schema.fields);
  const { file, previewUrl, error, setFile, setError, clearFile } = useUploadStore();
  const { setLoading, setResults, setError: setExtractionError } = useExtractionStore();
  const schema = useFormStore((s) => s.schema);

  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (fields.length === 0) {
      setError('Please create your form fields before uploading a document.');
      return;
    }
    const v = validateFile(f);
    if (!v.valid) {
      setError(v.error);
      return;
    }
    setFile(f);
  };

  const startExtraction = async () => {
    if (!file) return;
    setExtracting(true);
    setLoading();
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('schema', JSON.stringify({ fields: schema.fields }));
      const res = await axios.post(`${API}/extract-fields`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResults(res.data.results, res.data.model);
      onNext();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Extraction failed.';
      setExtractionError(msg);
      setError(msg);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-outfit text-3xl sm:text-4xl font-medium tracking-tight text-slate-900">Upload a document</h1>
        <p className="text-sm text-slate-500 mt-1 font-manrope">Drop a PDF or image — AI will fill in your <span className="font-medium text-slate-700">{schema.fields.length}-field</span> form.</p>
      </div>

      {!file ? (
        <>
        <Card
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          data-testid="upload-dropzone"
          className={`flex flex-col items-center justify-center gap-4 py-20 cursor-pointer transition-colors !border-2 !border-dashed ${
            dragging ? '!border-indigo-500 bg-indigo-50/60' : '!border-slate-300 bg-slate-50/40 hover:!border-slate-400 hover:bg-slate-100/60'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
            <Upload size={28} className="text-slate-400" />
          </div>
          <div className="text-center">
            <p className="font-outfit text-lg text-slate-800 font-medium">Drag & drop or click to browse</p>
            <p className="text-sm text-slate-500 mt-1 font-manrope">PDF, PNG, or JPG · up to 20 MB</p>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="gray">PDF</Badge>
            <Badge variant="gray">PNG</Badge>
            <Badge variant="gray">JPG</Badge>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            data-testid="file-input"
          />
        </Card>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500" data-testid="sample-links">
          <span className="font-manrope">Don't have a doc handy? Try a sample:</span>
          <a
            href="/samples/sample-invoice.pdf"
            target="_blank"
            rel="noreferrer"
            data-testid="sample-invoice-link"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium"
          >
            <FileText size={12} /> sample-invoice.pdf
          </a>
          <a
            href="/samples/sample-memo.pdf"
            target="_blank"
            rel="noreferrer"
            data-testid="sample-memo-link"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium"
          >
            <FileText size={12} /> sample-memo.pdf
          </a>
          <a
            href="/samples/sample-receipt.pdf"
            target="_blank"
            rel="noreferrer"
            data-testid="sample-receipt-link"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium"
          >
            <FileText size={12} /> sample-receipt.pdf
          </a>
        </div>
        </>
      ) : (
        <Card className="p-5 flex items-center gap-4" data-testid="file-preview-card">
          {previewUrl ? (
            <img src={previewUrl} alt="preview" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
          ) : (
            <div className="w-20 h-20 bg-rose-50 rounded-lg flex items-center justify-center">
              <FileText size={32} className="text-rose-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-outfit font-medium text-slate-900 truncate" data-testid="uploaded-filename">{file.name}</p>
            <p className="text-sm text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · {file.type}</p>
            <Badge variant="indigo" className="mt-2">Ready for extraction</Badge>
          </div>
          <button onClick={clearFile} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400" data-testid="remove-file-btn"><X size={18} /></button>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl" data-testid="upload-error">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="secondary" size="lg" onClick={onBack} data-testid="back-to-builder-btn">
          <ChevronLeft size={16} /> Back
        </Button>
        <Button
          variant="ai"
          size="lg"
          onClick={startExtraction}
          disabled={!file || extracting}
          data-testid="extract-btn"
        >
          <Sparkles size={16} /> {extracting ? 'Extracting…' : 'Extract with AI'}
        </Button>
      </div>
    </div>
  );
}
