import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import ALLOWED_IMAGE_SUFFIXES, GALLERY_DIR


def ensure_gallery_dir():
    GALLERY_DIR.mkdir(parents=True, exist_ok=True)


def image_suffix(name: str) -> str:
    return Path(name).suffix.lower()


def stored_path(stored_name: str) -> Path:
    return GALLERY_DIR / stored_name


async def save_image(upload: UploadFile) -> tuple[str, str, str]:
    name = upload.filename or "image"
    suffix = image_suffix(name)
    if suffix not in ALLOWED_IMAGE_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {name}")
    data = await upload.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image is larger than 8MB")
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    ensure_gallery_dir()
    stored_path(stored_name).write_bytes(data)
    mime = upload.content_type or "application/octet-stream"
    return name, stored_name, mime


def remove_stored(stored_name: str):
    path = stored_path(stored_name)
    if path.exists():
        path.unlink()
