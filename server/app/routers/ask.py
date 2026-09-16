from fastapi import APIRouter, HTTPException

from app.db import get_db
from app.schemas import AskRequest
from app.services.retrieve import answer_question
from app.services.suggest import generate_suggestions

router = APIRouter()


@router.post("/ask")
def ask(payload: AskRequest):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    connection = get_db()
    ready = connection.execute("SELECT COUNT(*) AS total FROM documents WHERE status = 'ready'").fetchone()["total"]
    if ready == 0:
        connection.close()
        raise HTTPException(status_code=400, detail="No ready documents. Ingest notes first.")
    rows = connection.execute(
        """
        SELECT chunks.text, documents.name, embeddings.vector
        FROM embeddings
        JOIN chunks ON chunks.id = embeddings.chunk_id
        JOIN documents ON documents.id = chunks.document_id
        WHERE documents.status = 'ready'
        """
    ).fetchall()
    connection.close()
    if not rows:
        raise HTTPException(status_code=400, detail="No embeddings found. Ingest notes first.")
    try:
        return answer_question(question, rows)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/suggest")
def suggest():
    connection = get_db()
    rows = connection.execute(
        "SELECT id, name, text FROM documents WHERE status = 'ready' ORDER BY id"
    ).fetchall()
    connection.close()
    if not rows:
        return {"questions": []}
    documents = [(row["id"], row["name"], row["text"]) for row in rows]
    try:
        return {"questions": generate_suggestions(documents)[:3]}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
