import io
from pathlib import Path

from docx import Document as DocxDocument
from fastapi import HTTPException
from pypdf import PdfReader

from app.config import ALLOWED_SUFFIXES


def read_upload(name: str, data: bytes) -> str:
    suffix = Path(name).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {name}")
    if suffix in {".txt", ".md"}:
        return data.decode("utf-8", errors="replace")
    if suffix == ".pdf":
        reader = PdfReader(io.BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    document = DocxDocument(io.BytesIO(data))
    return "\n".join(paragraph.text for paragraph in document.paragraphs)
