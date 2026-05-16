import React, { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, FolderOpen, Save, Download, Upload, FileJson, RotateCcw, X } from 'lucide-react';
import { useFormStore, saveTemplate, loadAllTemplates, deleteTemplate } from '../store';
import { exportSchema } from '../utils/helpers';
import { Button, Input, Select, Label, Card, Badge } from './ui';

const FIELD_TYPES = [
  { value: 'text', label: 'Single-line text' },
  { value: 'textarea', label: 'Multi-line text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
];

function FieldCard({ field }) {
  const { updateField, removeField } = useFormStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`field-card-${field.id}`}
      className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        data-testid={`drag-handle-${field.id}`}
        className="mt-1 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>

      <div className="flex-1 grid grid-cols-2 gap-2">
        <Input
          value={field.label}
          onChange={(e) => updateField(field.id, { label: e.target.value })}
          placeholder="Field label"
          data-testid={`field-label-input-${field.id}`}
          className="col-span-2"
        />
        <Select
          value={field.type}
          onChange={(e) => {
            const type = e.target.value;
            const patch = { type };
            if (type === 'dropdown' && !field.options) patch.options = ['Option 1', 'Option 2'];
            updateField(field.id, patch);
          }}
          data-testid={`field-type-select-${field.id}`}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-600 px-3 py-2 border border-slate-200 rounded-lg bg-white cursor-pointer">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => updateField(field.id, { required: e.target.checked })}
            data-testid={`field-required-checkbox-${field.id}`}
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="font-manrope">Required</span>
        </label>
        {field.type === 'dropdown' && (
          <Input
            className="col-span-2"
            placeholder="Options (comma-separated)"
            value={(field.options || []).join(', ')}
            data-testid={`field-options-input-${field.id}`}
            onChange={(e) => updateField(field.id, {
              options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
            })}
          />
        )}
      </div>

      <button
        onClick={() => removeField(field.id)}
        aria-label="Delete field"
        data-testid={`delete-field-${field.id}`}
        className="mt-1 text-slate-300 hover:text-rose-500 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function FormBuilder({ onShowTemplates, onShowImport }) {
  const { schema, addField, reorderFields, setTitle } = useFormStore();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) reorderFields(String(active.id), String(over.id));
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <Input
          value={schema.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Form title"
          data-testid="form-title-input"
          className="font-medium"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => saveTemplate(schema)} data-testid="save-template-btn">
          <Save size={14} /> Save template
        </Button>
        <Button variant="secondary" size="sm" onClick={onShowTemplates} data-testid="load-template-btn">
          <FolderOpen size={14} /> Load
        </Button>
        <Button variant="secondary" size="sm" onClick={() => exportSchema(schema)} data-testid="export-schema-btn">
          <Download size={14} /> Export JSON
        </Button>
        <Button variant="secondary" size="sm" onClick={onShowImport} data-testid="import-schema-btn">
          <Upload size={14} /> Import JSON
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={schema.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1" data-testid="fields-list">
            {schema.fields.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                <FileJson className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-sm font-manrope text-slate-500">No fields yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "Add field" below to get started</p>
              </div>
            ) : schema.fields.map((field) => (
              <FieldCard key={field.id} field={field} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button variant="ai" size="lg" onClick={() => addField('text')} data-testid="add-field-btn">
        <Plus size={16} /> Add field
      </Button>
    </div>
  );
}

function LivePreview() {
  const schema = useFormStore((s) => s.schema);
  if (schema.fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 text-slate-400">
        <FileJson size={40} className="mb-4 text-slate-300" />
        <p className="font-outfit text-lg text-slate-500">Your form preview will appear here</p>
        <p className="text-sm mt-1">Add fields on the left to see them rendered live</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5" data-testid="form-preview">
      <h2 className="font-outfit text-2xl font-medium text-slate-900 tracking-tight">{schema.title}</h2>
      {schema.fields.map((field) => (
        <PreviewField key={field.id} field={field} />
      ))}
    </div>
  );
}

function PreviewField({ field }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label required={field.required}>{field.label}</Label>
      {field.type === 'textarea' && <textarea disabled rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none cursor-not-allowed" />}
      {field.type === 'checkbox' && <input type="checkbox" disabled className="w-4 h-4 accent-indigo-600" />}
      {field.type === 'dropdown' && (
        <select disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-not-allowed">
          <option>Select…</option>
          {(field.options || []).map((o) => <option key={o}>{o}</option>)}
        </select>
      )}
      {['text', 'number', 'date'].includes(field.type) && (
        <input type={field.type} disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-not-allowed" />
      )}
    </div>
  );
}

function TemplatesModal({ onClose }) {
  const { loadSchema } = useFormStore();
  const [templates, setTemplates] = useState(loadAllTemplates());
  const onDelete = (id) => {
    deleteTemplate(id);
    setTemplates(loadAllTemplates());
  };
  return (
    <Modal onClose={onClose} title="Saved templates" testId="templates-modal">
      {templates.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">No templates saved yet. Use the Save button to keep your form schema.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-slate-300" data-testid={`template-item-${t.id}`}>
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate font-outfit">{t.title}</p>
                <p className="text-xs text-slate-500">{t.fields?.length || 0} fields · {new Date(t.savedAt || t.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ai" onClick={() => { loadSchema(t); onClose(); }} data-testid={`load-template-item-${t.id}`}>Load</Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(t.id)} data-testid={`delete-template-item-${t.id}`}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ImportModal({ onClose }) {
  const { loadSchema } = useFormStore();
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        if (!obj.fields || !Array.isArray(obj.fields)) throw new Error('Missing "fields" array');
        loadSchema({ ...obj, title: obj.title || 'Imported form' });
        onClose();
      } catch (err) {
        setError(`Invalid schema JSON: ${err.message}`);
      }
    };
    reader.onerror = () => setError('Could not read the file.');
    reader.readAsText(file);
  };

  return (
    <Modal onClose={onClose} title="Import form schema" testId="import-modal">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600">Upload a previously exported schema JSON file.</p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          data-testid="import-schema-input"
          className="text-sm"
        />
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
      </div>
    </Modal>
  );
}

function Modal({ onClose, title, children, testId }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" data-testid={testId}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-outfit text-xl font-medium">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" data-testid="modal-close-btn"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function BuilderStep({ onNext }) {
  const fields = useFormStore((s) => s.schema.fields);
  const { resetSchema } = useFormStore();
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-outfit text-3xl sm:text-4xl font-medium tracking-tight text-slate-900">Build your form</h1>
          <p className="text-sm text-slate-500 mt-1 font-manrope">Add fields that match the data you want to extract from documents.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetSchema} data-testid="reset-form-btn">
          <RotateCcw size={14} /> Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[540px]">
        <div className="lg:col-span-5">
          <Card className="p-5 h-full flex flex-col">
            <Label className="mb-4">Fields</Label>
            <FormBuilder onShowTemplates={() => setShowTemplates(true)} onShowImport={() => setShowImport(true)} />
          </Card>
        </div>
        <div className="lg:col-span-7">
          <Card className="p-6 lg:p-8 h-full overflow-y-auto">
            <Label className="mb-6 block">Live preview</Label>
            <LivePreview />
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="gray">{fields.length} field{fields.length === 1 ? '' : 's'}</Badge>
        <Button variant="ai" size="lg" onClick={onNext} disabled={fields.length === 0} data-testid="next-to-upload-btn">
          Continue to upload →
        </Button>
      </div>

      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
