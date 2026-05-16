# PRD — Autofill (AI Form Builder & Document Autofill)

## Original Problem Statement
Build an AI-powered form builder and document autofill application. Users create custom forms (text, multiline text, number, date, dropdown, checkbox; required/optional), upload documents (PDF / PNG / JPG), automatically extract relevant information via AI into the form fields, review/edit extracted values, and save the completed form. Configurable LLM API providers (OpenRouter / Nia / etc.) via env vars. Bonus: confidence indicators, drag-and-drop reordering, save/load templates, import/export schema, real-time extraction.

## User Decisions
- **Tech stack**: React + FastAPI + MongoDB (DB reserved but localStorage used for persistence)
- **LLM provider**: OpenRouter
- **API key**: provided by user (stored in `backend/.env`)
- **Default model**: `openai/gpt-oss-120b:free` (user's first choice `minimax/minimax-m2.5:free` was rate-limited at the time of build; switched after confirmation. Fully configurable via `OPENROUTER_MODEL` env var.)
- **Bonus features**: All requested (confidence, drag-drop, templates, import/export JSON)
- **Persistence**: localStorage only (no DB writes)
- **Design**: Clean modern minimalist light theme (Swiss / High-Contrast archetype)

## User Personas
- **Power user / SMB ops person**: builds custom intake forms for invoices, IDs, lease applications etc. Wants to upload a doc once and have it auto-filled.
- **Developer evaluating the tool**: cares about schema export/import, configurable LLM provider, clean API.

## Architecture
- Frontend (React) ↔ Backend (FastAPI) ↔ OpenRouter API
- Backend handles file → text (pdfplumber for PDFs, pytesseract OCR for images), prompt construction, LLM call, JSON parsing, type coercion
- API key never exposed to the browser

## Core Requirements (static)
1. Dynamic form builder with 6 field types
2. PDF / PNG / JPG upload with validation
3. AI extraction with confidence + blank-over-guess
4. Review with required-field validation
5. Configurable LLM provider via env vars

## Implemented (as of 2026-05-16)
- [x] Dynamic form builder (add/edit/remove/reorder fields)
- [x] All 6 field types (text, textarea, number, date, dropdown, checkbox)
- [x] Required/optional toggles
- [x] Live preview pane
- [x] File upload with drag-drop, validation, preview thumbnails
- [x] PDF text extraction via pdfplumber
- [x] Image text extraction via Tesseract OCR
- [x] LLM extraction via OpenRouter (configurable model)
- [x] Type coercion (string/number/date/bool/dropdown match)
- [x] Confidence badges (high / medium / low / not found) — **LLM self-rates each field**
- [x] Edited badge appears when user manually modifies an extracted value
- [x] Review screen with editable fields
- [x] Required-field highlighting + save block
- [x] JSON download of completed form
- [x] Drag-and-drop reordering (@dnd-kit)
- [x] Save/Load templates (localStorage)
- [x] Import/Export schema JSON
- [x] 3-step wizard with stepper navigation
- [x] data-testid coverage on all interactive elements
- [x] Edge cases: empty doc, bad MIME, oversize file, missing API key, invalid JSON from LLM, rate limit, required-field validation

## Verified End-to-End (manual + Playwright)
- Builder → 5 fields configured (text, text, number, date, dropdown)
- Template saved to localStorage
- PDF (sample invoice) uploaded
- Extraction returned all 5 fields correctly: `INV-2024-0856`, `Acme Corporation`, `1250`, `2024-03-15`, `Paid`
- Save → JSON downloaded → success screen shown
- Backend health, extract-text, extract-fields endpoints all 200

## Prioritized Backlog
- **P1** Streaming / real-time extraction updates (currently partial — loading state only, no progressive reveal)
- **P1** OCR quality for low-resolution images (consider preprocessing with PIL: contrast, deskew)
- **P2** Multi-document batch extraction
- **P2** Submission history persisted to MongoDB (DB scaffolding already in env)
- **P2** OAuth / multi-user (no auth currently)
- **P3** Pluggable provider adapters (Nia, direct Anthropic) in a strategy pattern
- **P3** PDF page-by-page preview alongside review
- **P3** Form sharing via public links

## Known Limitations
- Default model is text-only — image documents go through OCR first (quality dependent on input)
- localStorage persistence is per-browser, not synced across devices
- No auth → forms are not user-scoped
- Free OpenRouter models are rate-limited; users should swap to a paid model for production

## Next Action Items (next session candidates)
1. Add LLM-rated confidence scoring in the prompt (high/medium/low per field)
2. Implement progressive streaming of extracted fields as they arrive
3. Optional MongoDB persistence for submission history with a simple toggle
