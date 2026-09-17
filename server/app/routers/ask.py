import json

from fastapi import APIRouter, HTTPException

from app.db import get_db, utc_now
from app.schemas import AskRequest
from app.services.rag_modes import MODE_IDS, MODES
from app.services.retrieve import answer_question
from app.services.suggest import generate_suggestions

router = APIRouter()


def _trace(row) -> dict | None:
    keys = row.keys()
    if "trace" not in keys or not row["trace"]:
        return None
    try:
        payload = json.loads(row["trace"])
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def turn_payload(row) -> dict:
    keys = row.keys()
    return {
        "id": row["id"],
        "createdAt": row["created_at"],
        "question": row["question"],
        "answer": row["answer"],
        "chunks": json.loads(row["chunks"]),
        "mode": row["mode"] if "mode" in keys and row["mode"] else "basic",
        "trace": _trace(row),
    }


@router.get("/rag-modes")
def list_rag_modes():
    return {"modes": MODES}


@router.post("/ask")
def ask(payload: AskRequest):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    mode = (payload.mode or "basic").strip().lower()
    if mode not in MODE_IDS:
        raise HTTPException(status_code=400, detail="Unknown RAG mode")
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
    history_rows = connection.execute(
        "SELECT question, answer FROM chat_turns ORDER BY id DESC LIMIT 8"
    ).fetchall()
    connection.close()
    if not rows:
        raise HTTPException(status_code=400, detail="No embeddings found. Ingest notes first.")
    history = [{"question": row["question"], "answer": row["answer"]} for row in reversed(history_rows)]
    try:
        result = answer_question(question, rows, mode, history)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    created_at = utc_now()
    connection = get_db()
    cursor = connection.execute(
        "INSERT INTO chat_turns (created_at, question, answer, chunks, mode, trace) VALUES (?, ?, ?, ?, ?, ?)",
        (
            created_at,
            question,
            result["answer"],
            json.dumps(result["chunks"]),
            result.get("mode", mode),
            json.dumps(result.get("trace") or {}),
        ),
    )
    connection.commit()
    turn_id = cursor.lastrowid
    connection.close()
    return {
        "id": turn_id,
        "createdAt": created_at,
        "question": question,
        "answer": result["answer"],
        "chunks": result["chunks"],
        "mode": result.get("mode", mode),
        "trace": result.get("trace"),
    }


@router.get("/chat")
def list_chat():
    connection = get_db()
    rows = connection.execute(
        "SELECT id, created_at, question, answer, chunks, mode, trace FROM chat_turns ORDER BY id ASC"
    ).fetchall()
    connection.close()
    return {"turns": [turn_payload(row) for row in rows]}


@router.delete("/chat/{turn_id}")
def delete_chat(turn_id: int):
    connection = get_db()
    cursor = connection.execute("DELETE FROM chat_turns WHERE id = ?", (turn_id,))
    connection.commit()
    connection.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Chat turn not found")
    return {"ok": True}


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
