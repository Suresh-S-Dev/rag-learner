from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.db import get_db
from app.routers.gallery import image_payload
from app.services.gallery import save_image

router = APIRouter()


def point_payload(row, image_row=None) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "body": row["body"],
        "image": image_payload(image_row) if image_row is not None else None,
    }


@router.get("/learn")
def list_learn_points():
    connection = get_db()
    rows = connection.execute(
        "SELECT id, title, body, image_id FROM learn_points ORDER BY id DESC"
    ).fetchall()
    result = []
    for row in rows:
        image_row = None
        if row["image_id"] is not None:
            image_row = connection.execute(
                "SELECT id, name FROM gallery_images WHERE id = ?",
                (row["image_id"],),
            ).fetchone()
        result.append(point_payload(row, image_row))
    connection.close()
    return {"points": result}


@router.post("/learn")
async def create_learn_point(
    title: str = Form(...),
    body: str = Form(""),
    image: UploadFile | None = File(None),
):
    cleaned_title = title.strip()
    if not cleaned_title:
        raise HTTPException(status_code=400, detail="Title is required")
    image_id = None
    connection = get_db()
    if image is not None and image.filename:
        name, stored_name, mime = await save_image(image)
        cursor = connection.execute(
            "INSERT INTO gallery_images (name, stored_name, mime) VALUES (?, ?, ?)",
            (name, stored_name, mime),
        )
        image_id = cursor.lastrowid
    cursor = connection.execute(
        "INSERT INTO learn_points (title, body, image_id) VALUES (?, ?, ?)",
        (cleaned_title, body.strip(), image_id),
    )
    point_id = cursor.lastrowid
    connection.commit()
    row = connection.execute(
        "SELECT id, title, body, image_id FROM learn_points WHERE id = ?",
        (point_id,),
    ).fetchone()
    image_row = None
    if image_id is not None:
        image_row = connection.execute("SELECT id, name FROM gallery_images WHERE id = ?", (image_id,)).fetchone()
    connection.close()
    return point_payload(row, image_row)


@router.delete("/learn/{point_id}")
def delete_learn_point(point_id: int):
    connection = get_db()
    cursor = connection.execute("DELETE FROM learn_points WHERE id = ?", (point_id,))
    connection.commit()
    connection.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Learn point not found")
    return {"ok": True}
