from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.db import get_db
from app.services.gallery import read_image

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
        "SELECT data, mime, name FROM gallery_images WHERE id = ?",
        (image_id,),
    ).fetchone()
    connection.close()
    if row is None or row["data"] is None:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=bytes(row["data"]), media_type=row["mime"])


@router.post("/gallery")
async def upload_gallery(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No images uploaded")
    created = []
    connection = get_db()
    for upload in files:
        name, mime, data = await read_image(upload)
        cursor = connection.execute(
            "INSERT INTO gallery_images (name, stored_name, mime, data) VALUES (?, ?, ?, ?)",
            (name, "", mime, data),
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
    cursor = connection.execute("DELETE FROM gallery_images WHERE id = ?", (image_id,))
    connection.commit()
    connection.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"ok": True}
