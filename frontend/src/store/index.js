import { create } from 'zustand';
import { nanoid } from 'nanoid';

const STORAGE_KEY = 'ai-form-builder:templates';
const SCHEMA_KEY = 'ai-form-builder:current';

const loadCurrent = () => {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  return null;
};

const defaultSchema = () => ({
  id: nanoid(),
  title: 'Untitled form',
  fields: [],
  createdAt: new Date().toISOString(),
});

const persist = (schema) => {
  try {
    localStorage.setItem(SCHEMA_KEY, JSON.stringify(schema));
  } catch {
    /* noop */
  }
};

export const useFormStore = create((set, get) => ({
  schema: loadCurrent() || defaultSchema(),

  setTitle: (title) => {
    const next = { ...get().schema, title };
    persist(next);
    set({ schema: next });
  },

  addField: (type = 'text') => {
    const schema = get().schema;
    const newField = {
      id: nanoid(8),
      label: 'New field',
      type,
      required: false,
      ...(type === 'dropdown' ? { options: ['Option 1', 'Option 2'] } : {}),
    };
    const next = { ...schema, fields: [...schema.fields, newField] };
    persist(next);
    set({ schema: next });
  },

  updateField: (id, patch) => {
    const schema = get().schema;
    const next = {
      ...schema,
      fields: schema.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    };
    persist(next);
    set({ schema: next });
  },

  removeField: (id) => {
    const schema = get().schema;
    const next = { ...schema, fields: schema.fields.filter((f) => f.id !== id) };
    persist(next);
    set({ schema: next });
  },

  reorderFields: (activeId, overId) => {
    const schema = get().schema;
    const fields = [...schema.fields];
    const from = fields.findIndex((f) => f.id === activeId);
    const to = fields.findIndex((f) => f.id === overId);
    if (from === -1 || to === -1) return;
    const [moved] = fields.splice(from, 1);
    fields.splice(to, 0, moved);
    const next = { ...schema, fields };
    persist(next);
    set({ schema: next });
  },

  loadSchema: (schema) => {
    const next = {
      ...schema,
      id: schema.id || nanoid(),
      createdAt: schema.createdAt || new Date().toISOString(),
    };
    persist(next);
    set({ schema: next });
  },

  resetSchema: () => {
    const next = defaultSchema();
    persist(next);
    set({ schema: next });
  },
}));

/* ─── Templates (localStorage) ─── */

export const saveTemplate = (schema) => {
  try {
    const existing = loadAllTemplates();
    const updated = [...existing.filter((t) => t.id !== schema.id), { ...schema, savedAt: new Date().toISOString() }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
};

export const loadAllTemplates = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const deleteTemplate = (id) => {
  try {
    const existing = loadAllTemplates();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((t) => t.id !== id)));
  } catch {
    /* noop */
  }
};

/* ─── Upload store ─── */

export const useUploadStore = create((set, get) => ({
  file: null,
  previewUrl: null,
  mimeType: null,
  error: null,

  setFile: (file) => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    set({ file, previewUrl, mimeType: file.type, error: null });
  },

  setError: (error) => set({ error }),

  clearFile: () => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ file: null, previewUrl: null, mimeType: null, error: null });
  },
}));

/* ─── Extraction store ─── */

export const useExtractionStore = create((set) => ({
  results: {},
  status: 'idle', // idle | loading | done | error
  errorMsg: null,
  model: null,

  setLoading: () => set({ status: 'loading', errorMsg: null }),

  setResults: (results, model) =>
    set({
      results: Object.fromEntries(results.map((r) => [r.field_id, r])),
      status: 'done',
      errorMsg: null,
      model: model || null,
    }),

  setError: (msg) => set({ status: 'error', errorMsg: msg }),

  updateValue: (fieldId, value) =>
    set((s) => {
      const prev = s.results[fieldId] || { field_id: fieldId, confidence: 'none' };
      const isEmpty = value === null || value === undefined || value === '';
      return {
        results: {
          ...s.results,
          [fieldId]: {
            ...prev,
            field_id: fieldId,
            value,
            confidence: isEmpty ? 'none' : prev.confidence,
            edited: true,
          },
        },
      };
    }),

  reset: () => set({ results: {}, status: 'idle', errorMsg: null, model: null }),
}));
