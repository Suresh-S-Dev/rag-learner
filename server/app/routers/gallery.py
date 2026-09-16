from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.db import get_db
from app.services.gallery import remove_stored, save_image, stored_path

router = APIRouter()


def image_payload(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "url": f"/gallery/{row['id']}/file",
    }


@router.get("/gallery")
def list_gallery():
    connection = get_db()
    rows = connection.execute("SELECT id, name FROM gallery_images ORDER BY id DESC").fetchall()
    connection.close()
    return {"images": [image_payload(row) for row in rows]}


@router.get("/gallery/{image_id}/file")
def get_gallery_file(image_id: int):
    connection = get_db()
    row = connection.execute(
        "SELECT stored_name, mime, name FROM gallery_images WHERE id = ?",
        (image_id,),
    ).fetchone()
    connection.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Image not found")
    path = stored_path(row["stored_name"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image file missing")
    return FileResponse(path, media_type=row["mime"], filename=row["name"])


@router.post("/gallery")
async def upload_gallery(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No images uploaded")
    created = []
    connection = get_db()
    for upload in files:
        name, stored_name, mime = await save_image(upload)
        cursor = connection.execute(
            "INSERT INTO gallery_images (name, stored_name, mime) VALUES (?, ?, ?)",
            (name, stored_name, mime),
        )
        created.append(cursor.lastrowid)
    connection.commit()
    result = []
    for image_id in created:
        row = connection.execute("SELECT id, name FROM gallery_images WHERE id = ?", (image_id,)).fetchone()
        result.append(image_payload(row))
    connection.close()
    return {"images": result}


@router.delete("/gallery/{image_id}")
def delete_gallery(image_id: int):
    connection = get_db()
    row = connection.execute("SELECT stored_name FROM gallery_images WHERE id = ?", (image_id,)).fetchone()
    if row is None:
        connection.close()
        raise HTTPException(status_code=404, detail="Image not found")
    connection.execute("DELETE FROM gallery_images WHERE id = ?", (image_id,))
    connection.commit()
    connection.close()
    remove_stored(row["stored_name"])
    return {"ok": True}
