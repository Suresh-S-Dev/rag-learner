import sqlite3

from datetime import datetime, timezone

from app.config import DB_PATH
from app.services.gallery import migrate_gallery_blobs


def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def get_db():
    connection = sqlite3.connect(DB_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = get_db()
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            text TEXT NOT NULL,
            status TEXT NOT NULL,
            error TEXT
        )
        """
    )
    columns = {row["name"] for row in connection.execute("PRAGMA table_info(documents)")}
    if "error" not in columns:
        connection.execute("ALTER TABLE documents ADD COLUMN error TEXT")
    if "detail" not in columns:
        connection.execute("ALTER TABLE documents ADD COLUMN detail TEXT")
    if "created_at" not in columns:
        connection.execute("ALTER TABLE documents ADD COLUMN created_at TEXT")
    connection.execute(
        "UPDATE documents SET created_at = ? WHERE created_at IS NULL OR created_at = ''",
        (utc_now(),),
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            position INTEGER NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS embeddings (
            chunk_id INTEGER PRIMARY KEY,
            vector TEXT NOT NULL,
            FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS gallery_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            stored_name TEXT NOT NULL,
            mime TEXT NOT NULL,
            data BLOB
        )
        """
    )
    migrate_gallery_blobs(connection)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS learn_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            image_id INTEGER,
            FOREIGN KEY (image_id) REFERENCES gallery_images(id) ON DELETE SET NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            chunks TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS suggestions (
            ready_key TEXT PRIMARY KEY,
            questions TEXT NOT NULL
        )
        """
    )
    chat_columns = {row["name"] for row in connection.execute("PRAGMA table_info(chat_turns)")}
    if "mode" not in chat_columns:
        connection.execute("ALTER TABLE chat_turns ADD COLUMN mode TEXT")
    if "trace" not in chat_columns:
        connection.execute("ALTER TABLE chat_turns ADD COLUMN trace TEXT")
    connection.commit()
    connection.close()


def set_status(connection, document_id: int, status: str, error: str | None = None, detail: str | None = None):
    connection.execute(
        "UPDATE documents SET status = ?, error = ?, detail = ? WHERE id = ?",
        (status, error, detail, document_id),
    )
    connection.commit()


def document_payload(row: sqlite3.Row, chunks: int) -> dict:
    keys = row.keys()
    return {
        "id": row["id"],
        "name": row["name"],
        "status": row["status"],
        "error": row["error"],
        "detail": row["detail"] if "detail" in keys else None,
        "createdAt": row["created_at"] if "created_at" in keys else None,
        "chunks": chunks,
    }


def chunk_count(connection, document_id: int) -> int:
    return connection.execute(
        "SELECT COUNT(*) AS total FROM chunks WHERE document_id = ?",
        (document_id,),
    ).fetchone()["total"]
