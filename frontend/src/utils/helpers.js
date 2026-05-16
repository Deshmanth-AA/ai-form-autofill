const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_BYTES = 20 * 1024 * 1024;

export function validateFile(file) {
  if (!file) return { valid: false, error: 'No file provided.' };
  if (!ALLOWED_MIME.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type || 'unknown'}. Please upload a PDF, PNG, or JPG.`,
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      valid: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 20 MB.`,
    };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }
  return { valid: true };
}

export function exportFormData(schema, results) {
  const output = {
    formTitle: schema.title,
    exportedAt: new Date().toISOString(),
    fields: schema.fields.map((f) => ({
      label: f.label,
      type: f.type,
      required: f.required,
      value: results[f.id]?.value ?? null,
      confidence: results[f.id]?.confidence ?? 'none',
    })),
  };
  downloadJson(output, `${schema.title.replace(/\s+/g, '_')}_${Date.now()}.json`);
  return output;
}

export function exportSchema(schema) {
  const cleanSchema = {
    title: schema.title,
    fields: schema.fields.map(({ id, label, type, required, options, placeholder }) => ({
      id,
      label,
      type,
      required,
      ...(options ? { options } : {}),
      ...(placeholder ? { placeholder } : {}),
    })),
  };
  downloadJson(cleanSchema, `${schema.title.replace(/\s+/g, '_')}_schema.json`);
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
