import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, RotateCcw, Download, FileText } from 'lucide-react';
import { useFormStore, useUploadStore, useExtractionStore } from '../store';
import { exportFormData } from '../utils/helpers';
import { Button, Card, Label, Input, Select, Textarea, ConfidenceBadge, Badge } from './ui';

export default function ReviewStep({ onBack, onDone }) {
  const { schema } = useFormStore();
  const { file, previewUrl } = useUploadStore();
  const { results, updateValue, model, status, errorMsg } = useExtractionStore();
  const [attempted, setAttempted] = useState(false);
  const [saved, setSaved] = useState(null);

  const missingRequired = schema.fields.filter(
    (f) => f.required && (results[f.id]?.value === null || results[f.id]?.value === undefined || results[f.id]?.value === '')
  );
  const extractedCount = Object.values(results).filter((r) => r.value !== null && r.value !== '' && r.value !== undefined).length;

  const handleSave = () => {
    setAttempted(true);
    if (missingRequired.length > 0) {
      const el = document.getElementById(`review-field-${missingRequired[0].id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const data = exportFormData(schema, results);
    setSaved(data);
  };

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center max-w-md mx-auto">
        <AlertCircle size={42} className="text-rose-500" />
        <h2 className="font-outfit text-2xl text-slate-900">Extraction failed</h2>
        <p className="text-sm text-slate-600">{errorMsg}</p>
        <Button variant="ai" onClick={onBack} data-testid="retry-extraction-btn"><RotateCcw size={16} /> Try again</Button>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center max-w-md mx-auto" data-testid="save-success">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="font-outfit text-2xl text-slate-900">Form saved</h2>
        <p className="text-sm text-slate-600">Your completed form has been downloaded as a JSON file.</p>
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" onClick={() => setSaved(null)} data-testid="back-to-review-btn">Back to review</Button>
          <Button variant="ai" onClick={onDone} data-testid="start-new-form-btn"><RotateCcw size={16} /> Start a new form</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-outfit text-3xl sm:text-4xl font-medium tracking-tight text-slate-900">Review extracted data</h1>
          <p className="text-sm text-slate-500 mt-1 font-manrope">
            <span className="font-medium text-slate-700">{extractedCount}</span> of {schema.fields.length} fields extracted. Edit any value before saving.
          </p>
          {model && <Badge variant="indigo" className="mt-2 !normal-case">Model: {model}</Badge>}
        </div>
      </div>

      {file && (
        <Card className="p-3 flex items-center gap-3 bg-slate-50/60">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="w-10 h-10 object-cover rounded-md border border-slate-200" />
          ) : (
            <div className="w-10 h-10 bg-white rounded-md border border-slate-200 flex items-center justify-center">
              <FileText size={18} className="text-slate-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
          </div>
        </Card>
      )}

      {attempted && missingRequired.length > 0 && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700" data-testid="missing-required-alert">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>{missingRequired.length} required field{missingRequired.length > 1 ? 's are' : ' is'} missing.</strong> Please fill them in before saving.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {schema.fields.map((field) => {
          const result = results[field.id];
          const value = result?.value;
          const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'boolean' && false === value && field.type !== 'checkbox');
          const trulyEmpty = value === null || value === undefined || value === '';
          const isError = attempted && field.required && trulyEmpty;
          const confidence = result?.confidence || 'none';

          return (
            <Card
              key={field.id}
              id={`review-field-${field.id}`}
              data-testid={`review-field-${field.id}`}
              className={`p-5 transition-colors ${isError ? '!border-rose-300 bg-rose-50/40' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Label required={field.required}>{field.label}</Label>
                <div className="flex items-center gap-1.5">
                  {result?.edited && (
                    <Badge variant="indigo" className="!normal-case !tracking-wider" data-testid={`edited-badge-${field.id}`}>Edited</Badge>
                  )}
                  <ConfidenceBadge confidence={confidence} />
                </div>
              </div>

              {field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => updateValue(field.id, e.target.checked)}
                    data-testid={`review-input-${field.id}`}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span>{value ? 'Yes' : 'No'}</span>
                </label>
              ) : field.type === 'dropdown' ? (
                <Select
                  value={value ?? ''}
                  error={isError}
                  onChange={(e) => updateValue(field.id, e.target.value || null)}
                  data-testid={`review-input-${field.id}`}
                >
                  <option value="">Select…</option>
                  {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              ) : field.type === 'textarea' ? (
                <Textarea
                  rows={3}
                  value={value ?? ''}
                  error={isError}
                  onChange={(e) => updateValue(field.id, e.target.value || null)}
                  data-testid={`review-input-${field.id}`}
                />
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={value ?? ''}
                  error={isError}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') updateValue(field.id, null);
                    else if (field.type === 'number') updateValue(field.id, Number(v));
                    else updateValue(field.id, v);
                  }}
                  data-testid={`review-input-${field.id}`}
                />
              )}

              {result?.raw_text && ['high', 'medium', 'low'].includes(confidence) && (
                <p className="text-xs text-slate-400 italic mt-2 font-manrope">Extracted: "{String(result.raw_text).slice(0, 120)}{String(result.raw_text).length > 120 ? '…' : ''}"</p>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" size="lg" onClick={onBack} data-testid="back-to-upload-btn">← Back</Button>
        <Button variant="ai" size="lg" onClick={handleSave} data-testid="save-form-btn">
          <Download size={16} /> Save & download JSON
        </Button>
      </div>
    </div>
  );
}
