import json

from app.db import get_db, set_status
from app.services.bedrock import bedrock_client, embed_text
from app.services.chunking import chunk_text


def process_document(document_id: int):
    connection = get_db()
    row = connection.execute("SELECT id, text FROM documents WHERE id = ?", (document_id,)).fetchone()
    if row is None:
        connection.close()
        return
    try:
        set_status(connection, document_id, "chunking", detail="Splitting text into chunks")
        connection.execute("DELETE FROM chunks WHERE document_id = ?", (document_id,))
        pieces = chunk_text(row["text"])
        if not pieces:
            set_status(connection, document_id, "error", "No text could be extracted", "No text could be extracted")
            connection.close()
            return
        chunk_ids: list[tuple[int, str]] = []
        for position, piece in enumerate(pieces):
            cursor = connection.execute(
                "INSERT INTO chunks (document_id, text, position) VALUES (?, ?, ?)",
                (document_id, piece, position),
            )
            chunk_ids.append((cursor.lastrowid, piece))
        connection.commit()
        total = len(chunk_ids)
        set_status(connection, document_id, "embedding", detail=f"Creating embeddings (0 of {total})")
        client = bedrock_client()
        for index, (chunk_id, piece) in enumerate(chunk_ids, start=1):
            vector = embed_text(client, piece)
            connection.execute(
                "INSERT OR REPLACE INTO embeddings (chunk_id, vector) VALUES (?, ?)",
                (chunk_id, json.dumps(vector)),
            )
            connection.commit()
            set_status(connection, document_id, "embedding", detail=f"Creating embeddings ({index} of {total})")
        set_status(connection, document_id, "ready", detail="Ready to ask")
    except Exception as exc:
        set_status(connection, document_id, "error", str(exc), "Failed during processing")
    finally:
        connection.close()
