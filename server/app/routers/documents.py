from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from app.db import chunk_count, document_payload, get_db
from app.services.files import read_upload
from app.services.pipeline import process_document

router = APIRouter()


@router.get("/documents")
def list_documents():
    connection = get_db()
    rows = connection.execute("SELECT id, name, status, error, detail FROM documents ORDER BY id DESC").fetchall()
    result = [document_payload(row, chunk_count(connection, row["id"])) for row in rows]
    connection.close()
    return {"files": result}


@router.get("/documents/{document_id}")
def get_document(document_id: int):
    connection = get_db()
    row = connection.execute(
        "SELECT id, name, text, status, error, detail FROM documents WHERE id = ?",
        (document_id,),
    ).fetchone()
    if row is None:
        connection.close()
        raise HTTPException(status_code=404, detail="Document not found")
    payload = {**document_payload(row, chunk_count(connection, document_id)), "text": row["text"]}
    connection.close()
    return payload


@router.get("/documents/{document_id}/chunks")
def get_chunks(document_id: int):
    connection = get_db()
    exists = connection.execute("SELECT id FROM documents WHERE id = ?", (document_id,)).fetchone()
    if exists is None:
        connection.close()
        raise HTTPException(status_code=404, detail="Document not found")
    rows = connection.execute(
        "SELECT id, position, text FROM chunks WHERE document_id = ? ORDER BY position",
        (document_id,),
    ).fetchall()
    connection.close()
    return {"chunks": [dict(row) for row in rows]}


@router.delete("/documents/{document_id}")
def delete_document(document_id: int):
    connection = get_db()
    cursor = connection.execute("DELETE FROM documents WHERE id = ?", (document_id,))
    connection.commit()
    connection.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


def process_documents(document_ids: list[int]):
    for document_id in document_ids:
        process_document(document_id)


@router.post("/ingest")
async def ingest(background: BackgroundTasks, files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    created = []
    connection = get_db()
    for upload in files:
        name = upload.filename or "untitled"
        data = await upload.read()
        text = read_upload(name, data).strip()
        cursor = connection.execute(
            "INSERT INTO documents (name, text, status, error, detail) VALUES (?, ?, ?, ?, ?)",
            (name, text, "queued", None, "Saved, waiting to process"),
        )
        created.append(cursor.lastrowid)
    connection.commit()
    result = []
    for document_id in created:
        row = connection.execute(
            "SELECT id, name, status, error, detail FROM documents WHERE id = ?",
            (document_id,),
        ).fetchone()
        result.append(document_payload(row, chunk_count(connection, document_id)))
    connection.close()
    background.add_task(process_documents, created)
    return {"files": result}
