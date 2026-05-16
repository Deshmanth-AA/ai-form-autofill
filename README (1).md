# AI Form Builder & Document Autofill

An AI-powered application that lets users build custom forms at runtime, upload PDF or image documents, and automatically extract field values using the Anthropic Claude API.

---

## Screenshots / Demo

> Record a short Loom video walking through the 4 steps, or drop screenshots in `/docs/screenshots/`.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Schema-driven components + full type safety |
| Build | Vite | Fast HMR, native ESM, env variable support |
| State | Zustand | 3 lightweight stores, no boilerplate |
| Styling | Tailwind CSS v3 | Utility-first, no runtime CSS-in-JS |
| Drag & drop | @dnd-kit/core | Accessible DnD, no legacy deps |
| AI | Anthropic SDK (claude-sonnet-4) | Vision + structured JSON output |
| IDs | nanoid | Tiny URL-safe unique IDs |
| Testing | Vitest | Vite-native, Jest-compatible |
| Icons | Lucide React | Tree-shakeable, consistent 24px stroke |
| Persistence | localStorage | Templates + history, no backend needed |

---

## Setup

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

### Installation

```bash
git clone https://github.com/your-username/ai-form-autofill
cd ai-form-autofill
npm install
```

### Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

> The key is used client-side via Vite's `import.meta.env`. For production, proxy through a backend server so the key is never exposed.

### Run

```bash
npm run dev       # development server → http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview production build
npm run test      # run unit tests
```

---

## How It Works

### Step 1 — Build your form

- Add fields with the **+ Add field** button
- Configure each field: label, type (text / textarea / number / date / dropdown / checkbox), required toggle
- Drag handles let you reorder fields at any time
- Live preview updates in real time on the right panel
- Save the schema as a reusable template via the toolbar

### Step 2 — Upload a document

- Drag and drop or click to browse
- Supported: PDF, PNG, JPG, JPEG (max 20 MB)
- A thumbnail preview is shown on success
- Uploading before creating a form is blocked with a friendly error

### Step 3 — AI extraction

- The form schema and document are sent to `claude-sonnet-4` together
- The model returns a JSON object mapping field IDs to extracted values
- Fields where the model has low confidence are left blank (never guessed)
- Confidence badges (high / medium / low / none) are shown per field

### Step 4 — Review and save

- All extracted values are editable
- Required fields missing a value are highlighted in red; saving is blocked until they are filled
- The completed form can be saved as JSON or submitted
- Start over with a new form or load a saved template

---

## Project Structure

```
src/
├── types/           # FieldSchema, FormSchema, ExtractionResult
├── store/           # Zustand stores (form, upload, extraction)
├── services/        # Anthropic API, file validation, templates
├── components/
│   ├── builder/     # FormBuilderPanel, FieldCard, LivePreview
│   ├── upload/      # DropZone, FilePreview, UploadError
│   ├── extraction/  # ExtractionLoader, ConfidenceBadge
│   └── review/      # ReviewPanel, ReviewField, SubmitBar
├── pages/           # BuilderPage, UploadPage, ExtractionPage, ReviewPage
├── hooks/           # useDragSort, useExtraction
└── utils/           # typeCoerce, promptBuilder, exportJson
```

---

## Key Design Decisions

### Schema-driven everything

`FormSchema` is the single source of truth. Every component — preview, extraction prompt, review panel — renders from the same schema object. Adding a new field type only requires updating `FieldType` and the type coercion logic.

### No backend required

The Anthropic API is called directly from the browser. All persistence uses `localStorage`. This simplifies deployment to any static host (Vercel, Netlify, GitHub Pages).

### Extraction prompt design

The extraction prompt is built dynamically from the form schema. Each field's `label`, `type`, and `required` flag are included so the model knows exactly what to look for and what format to return. The system prompt explicitly instructs the model to return `null` rather than guess.

### Confidence indicators

The model's response is used as-is (high confidence) or set to null (none). A future enhancement could ask the model to self-rate confidence per field by including it in the response schema.

### Blank over guess

Any field where the extracted value is `null`, fails type coercion, or returns a value not in the allowed `options` list is left blank. Users see a "none" confidence badge and must fill it manually.

---

## Assumptions

- The Anthropic API key is available in the browser environment (acceptable for a hackathon / demo; add a proxy for production)
- Documents are single-page or the most relevant data appears on the first page (Claude vision handles multi-page PDFs but extraction quality degrades on very long docs)
- The "real-time extraction updates" bonus feature is noted as partial — streaming is not used because the full JSON response must be parsed atomically

---

## Edge Cases Handled

| Scenario | Behaviour |
|---|---|
| Upload before form exists | Blocked, instructional error shown |
| Unsupported file type | Blocked at MIME validation, no state change |
| File > 20 MB | Blocked with size error |
| Corrupted file | FileReader error caught, previous state preserved |
| Missing API key | Banner shown before extraction, step blocked |
| AI returns invalid JSON | 1 auto-retry, then error state with retry button |
| AI cannot find a value | Field left blank, confidence = "none" |
| Type mismatch (e.g. "5th Jan" for date field) | Coercion fails → null, confidence = "low" |
| Dropdown value not in options list | Left blank for user selection |
| Required field missing at submit | Field highlighted red, submit blocked, auto-scroll |
| Network timeout | Error state with retry button shown |

---

## License

MIT
