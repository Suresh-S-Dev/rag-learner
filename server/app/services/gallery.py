from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import ALLOWED_IMAGE_SUFFIXES, GALLERY_DIR


def image_suffix(name: str) -> str:
    return Path(name).suffix.lower()


def stored_path(stored_name: str) -> Path:
    return GALLERY_DIR / stored_name


async def read_image(upload: UploadFile) -> tuple[str, str, bytes]:
    name = upload.filename or "image"
    suffix = image_suffix(name)
    if suffix not in ALLOWED_IMAGE_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {name}")
    data = await upload.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image is larger than 8MB")
    mime = upload.content_type or "application/octet-stream"
    return name, mime, data


def migrate_gallery_blobs(connection):
    columns = {row["name"] for row in connection.execute("PRAGMA table_info(gallery_images)")}
    if "data" not in columns:
        connection.execute("ALTER TABLE gallery_images ADD COLUMN data BLOB")
    rows = connection.execute("SELECT id, stored_name, data FROM gallery_images").fetchall()
    for row in rows:
        if row["data"]:
            continue
        name = row["stored_name"]
        if not name:
            continue
        path = stored_path(name)
        if not path.exists():
            continue
        connection.execute("UPDATE gallery_images SET data = ? WHERE id = ?", (path.read_bytes(), row["id"]))
        path.unlink()
