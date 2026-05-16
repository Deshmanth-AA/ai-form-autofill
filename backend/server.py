"""
AI Form Builder & Document Autofill — FastAPI backend.

Endpoints (all under /api):
  GET  /api/health                  → service status + provider config
  POST /api/extract-text            → upload PDF/PNG/JPG, returns plain text
  POST /api/extract-fields          → upload doc + form schema → returns extracted field values
"""

from __future__ import annotations

import io
import json
import os
import re
from typing import Any, Optional

import httpx
import pdfplumber
import pytesseract
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

load_dotenv()

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "minimax/minimax-m2.5:free")
OPENROUTER_BASE_URL = os.environ.get(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
)
APP_NAME = os.environ.get("APP_NAME", "AI Form Autofill")

ALLOWED_MIME = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

app = FastAPI(title=f"{APP_NAME} API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────


class FieldSchema(BaseModel):
    id: str
    label: str
    type: str  # text | textarea | number | date | dropdown | checkbox
    required: bool = False
    options: Optional[list[str]] = None


class ExtractRequest(BaseModel):
    fields: list[FieldSchema]
    document_text: str


class ExtractedField(BaseModel):
    field_id: str
    value: Any
    confidence: str  # high | medium | low | none
    raw_text: Optional[str] = None


class ExtractResponse(BaseModel):
    results: list[ExtractedField]
    model: str
    document_length: int


# ─────────────────────────────────────────────────────────────────────────────
# Helpers — Document → text
# ─────────────────────────────────────────────────────────────────────────────


def extract_text_from_pdf(data: bytes) -> str:
    """Extract text from a PDF using pdfplumber. Fallback to empty if unreadable."""
    text_parts: list[str] = []
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    text_parts.append(page_text)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=400,
            detail=f"Could not read the PDF. It may be corrupted: {exc}",
        )
    return "\n\n".join(text_parts).strip()


def extract_text_from_image(data: bytes) -> str:
    """Run OCR on an image and return the recognised text."""
    try:
        image = Image.open(io.BytesIO(data))
        # Convert to RGB to ensure tesseract compatibility
        if image.mode != "RGB":
            image = image.convert("RGB")
        return pytesseract.image_to_string(image).strip()
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read the image. It may be corrupted: {exc}",
        )


async def file_to_text(file: UploadFile) -> str:
    """Validate the upload and return its extracted text."""
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: {file.content_type or 'unknown'}. "
                "Please upload a PDF, PNG, or JPG."
            ),
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File is too large ({len(data) / 1024 / 1024:.1f} MB). "
                "Maximum size is 20 MB."
            ),
        )
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if file.content_type == "application/pdf":
        text = extract_text_from_pdf(data)
    else:
        text = extract_text_from_image(data)

    if not text:
        # Not an error: empty doc just means AI will return nulls everywhere.
        text = ""

    return text


# ─────────────────────────────────────────────────────────────────────────────
# Helpers — LLM extraction prompt
# ─────────────────────────────────────────────────────────────────────────────


SYSTEM_PROMPT = (
    "You are a precise document data extraction assistant. "
    "For each requested field you must return BOTH the extracted value AND a confidence rating. "
    "Confidence levels:\n"
    "  - \"high\"  : the value is clearly and unambiguously stated in the document.\n"
    "  - \"medium\": the value can be inferred but the phrasing is indirect or partial.\n"
    "  - \"low\"   : the value is uncertain, ambiguous, or could be wrong.\n"
    "  - \"none\"  : the value is not present in the document — value MUST be null.\n"
    "Never invent or guess. If unsure, prefer null + 'none' over a guess. "
    "Respond with ONLY valid JSON — no prose, no markdown fences."
)


def build_user_prompt(fields: list[FieldSchema], document_text: str) -> str:
    field_specs = []
    return_shape = []
    for f in fields:
        spec = {
            "id": f.id,
            "label": f.label,
            "type": f.type,
            "required": f.required,
        }
        if f.options:
            spec["options"] = f.options
        field_specs.append(spec)

        if f.type == "number":
            value_type = "number | null"
        elif f.type == "checkbox":
            value_type = "boolean | null"
        elif f.type == "date":
            value_type = '"YYYY-MM-DD" | null'
        else:
            value_type = "string | null"
        return_shape.append(
            f'  "{f.id}": {{ "value": {value_type}, "confidence": "high" | "medium" | "low" | "none" }}'
        )

    return (
        "Extract the following fields from the document below.\n\n"
        f"FIELDS:\n{json.dumps(field_specs, indent=2)}\n\n"
        "Return a JSON object with EXACTLY these keys. Each key maps to an object with `value` and `confidence`:\n"
        "{\n" + ",\n".join(return_shape) + "\n}\n\n"
        "Rules:\n"
        "- Dates must be ISO 8601 (YYYY-MM-DD).\n"
        "- Numbers must be plain numbers (no $ or commas).\n"
        "- Checkboxes must be true/false.\n"
        "- Dropdown values must exactly match one of the provided options or null.\n"
        "- If a value is null, its confidence MUST be \"none\".\n"
        "- Be honest about confidence — `low` is better than a wrong `high`.\n\n"
        f"DOCUMENT:\n\"\"\"\n{document_text}\n\"\"\""
    )


def coerce_value(raw: Any, field: FieldSchema) -> Any:
    """Type-coerce the model's raw output to the field's declared type."""
    if raw is None:
        return None
    try:
        if field.type in ("text", "textarea"):
            return str(raw) if raw != "" else None
        if field.type == "number":
            if isinstance(raw, (int, float)):
                return raw
            cleaned = re.sub(r"[^0-9.\-]", "", str(raw))
            return float(cleaned) if cleaned not in ("", "-", ".") else None
        if field.type == "date":
            s = str(raw).strip()
            if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
                return s
            return None
        if field.type == "checkbox":
            if isinstance(raw, bool):
                return raw
            lower = str(raw).strip().lower()
            if lower in ("true", "yes", "1", "checked", "y"):
                return True
            if lower in ("false", "no", "0", "unchecked", "n"):
                return False
            return None
        if field.type == "dropdown":
            opts = field.options or []
            for o in opts:
                if o.strip().lower() == str(raw).strip().lower():
                    return o
            return None
    except Exception:
        return None
    return None


def parse_llm_json(content: str) -> dict[str, Any]:
    """Robustly pull a JSON object out of the model's response."""
    cleaned = content.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # find first { and last } and try again
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                pass
    raise HTTPException(
        status_code=502,
        detail="The AI returned an unparseable response. Please retry.",
    )


async def call_openrouter(fields: list[FieldSchema], document_text: str) -> dict[str, Any]:
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY is not configured on the server.",
        )

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(fields, document_text)},
        ],
        "temperature": 0.0,
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://formautofill.app",
        "X-Title": APP_NAME,
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            resp = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502, detail=f"AI provider network error: {exc}"
            )

        if resp.status_code != 200:
            try:
                err = resp.json()
                msg = err.get("error", {}).get("message") or str(err)
            except Exception:
                msg = resp.text
            raise HTTPException(
                status_code=502,
                detail=f"AI provider error ({resp.status_code}): {msg}",
            )

        data = resp.json()
        try:
            msg = data["choices"][0]["message"]
        except (KeyError, IndexError):
            raise HTTPException(
                status_code=502, detail="AI provider returned an unexpected payload."
            )
        # Some models (reasoning models) put output in reasoning_content
        content = msg.get("content") or msg.get("reasoning_content") or msg.get("reasoning") or ""
        if not content or not content.strip():
            raise HTTPException(
                status_code=502,
                detail=(
                    "AI provider returned an empty response. "
                    "The selected model may be rate-limited or unavailable. "
                    "Try changing OPENROUTER_MODEL in backend/.env to e.g. "
                    "'google/gemini-2.5-flash' or 'anthropic/claude-3.5-haiku'."
                ),
            )

    return parse_llm_json(content)


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "app": APP_NAME,
        "provider": "openrouter",
        "model": OPENROUTER_MODEL,
        "key_configured": bool(OPENROUTER_API_KEY),
    }


@app.post("/api/extract-text")
async def extract_text_endpoint(file: UploadFile = File(...)) -> dict[str, Any]:
    text = await file_to_text(file)
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "char_count": len(text),
        "text": text,
    }


@app.post("/api/extract-fields", response_model=ExtractResponse)
async def extract_fields_endpoint(
    file: UploadFile = File(...),
    schema: str = Form(...),
) -> ExtractResponse:
    """Single-shot: upload doc + schema (JSON string) → get extracted values."""
    try:
        schema_data = json.loads(schema)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="`schema` must be valid JSON.")

    fields_raw = schema_data.get("fields", schema_data)
    if not isinstance(fields_raw, list) or not fields_raw:
        raise HTTPException(
            status_code=400,
            detail="`schema.fields` must be a non-empty list.",
        )

    try:
        fields = [FieldSchema(**f) for f in fields_raw]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid field schema: {exc}")

    document_text = await file_to_text(file)

    if not document_text:
        # Empty doc → return all-null results without calling the LLM
        results = [
            ExtractedField(field_id=f.id, value=None, confidence="none")
            for f in fields
        ]
        return ExtractResponse(
            results=results, model=OPENROUTER_MODEL, document_length=0
        )

    raw_values = await call_openrouter(fields, document_text)

    valid_confidences = {"high", "medium", "low", "none"}
    results: list[ExtractedField] = []
    for f in fields:
        entry = raw_values.get(f.id)

        # The model is asked for { "value": ..., "confidence": ... }, but
        # gracefully accept the legacy "scalar value" shape as well.
        if isinstance(entry, dict) and ("value" in entry or "confidence" in entry):
            raw = entry.get("value")
            model_confidence = str(entry.get("confidence", "")).strip().lower()
        else:
            raw = entry
            model_confidence = ""

        coerced = coerce_value(raw, f)

        # If coercion produced null, override the model's confidence to "none".
        if coerced is None:
            final_confidence = "none"
        elif model_confidence in valid_confidences and model_confidence != "none":
            final_confidence = model_confidence
        else:
            # Model didn't supply a usable rating but we got a coerced value → default "medium".
            final_confidence = "medium"

        results.append(
            ExtractedField(
                field_id=f.id,
                value=coerced,
                confidence=final_confidence,
                raw_text=str(raw) if raw is not None else None,
            )
        )

    return ExtractResponse(
        results=results,
        model=OPENROUTER_MODEL,
        document_length=len(document_text),
    )


@app.get("/api/")
async def root() -> dict[str, str]:
    return {"message": f"{APP_NAME} API. See /api/health for status."}
