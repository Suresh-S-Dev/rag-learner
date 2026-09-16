import json

from app.db import get_db
from app.services.bedrock import bedrock_client, generate_suggestions as write_questions


def generate_suggestions(documents: list[tuple[int, str, str]]) -> list[str]:
    if not documents:
        return []
    ready_key = ",".join(str(item[0]) for item in documents)
    connection = get_db()
    try:
        row = connection.execute(
            "SELECT questions FROM suggestions WHERE ready_key = ?",
            (ready_key,),
        ).fetchone()
        if row:
            cached = json.loads(row["questions"])
            if isinstance(cached, list):
                questions = [str(item).strip() for item in cached if str(item).strip()]
                if questions:
                    return questions[:3]
        notes = [(name, text) for _id, name, text in documents]
        questions = write_questions(bedrock_client(), notes)[:3]
        connection.execute("DELETE FROM suggestions")
        connection.execute(
            "INSERT INTO suggestions (ready_key, questions) VALUES (?, ?)",
            (ready_key, json.dumps(questions)),
        )
        connection.commit()
        return questions
    finally:
        connection.close()
