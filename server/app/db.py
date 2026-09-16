import sqlite3

from app.config import DB_PATH


def get_db():
    connection = sqlite3.connect(DB_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


from app.services.gallery import ensure_gallery_dir


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    ensure_gallery_dir()
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
            mime TEXT NOT NULL
        )
        """
    )
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
        CREATE TABLE IF NOT EXISTS suggestions (
            ready_key TEXT PRIMARY KEY,
            questions TEXT NOT NULL
        )
        """
    )
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
        "chunks": chunks,
    }


def chunk_count(connection, document_id: int) -> int:
    return connection.execute(
        "SELECT COUNT(*) AS total FROM chunks WHERE document_id = ?",
        (document_id,),
    ).fetchone()["total"]
