import json

import numpy as np

from app.config import TOP_K
from app.services.bedrock import bedrock_client, embed_text, generate_answer


def cosine_similarity(left: list[float], right: list[float]) -> float:
    a = np.array(left, dtype=float)
    b = np.array(right, dtype=float)
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def answer_question(question: str, rows) -> dict:
    client = bedrock_client()
    query = embed_text(client, question)
    ranked = []
    for row in rows:
        score = cosine_similarity(query, json.loads(row["vector"]))
        ranked.append({"source": row["name"], "score": round(score, 4), "text": row["text"]})
    ranked.sort(key=lambda item: item["score"], reverse=True)
    top = ranked[:TOP_K]
    context = "\n\n".join(f"Source: {item['source']}\n{item['text']}" for item in top)
    answer = generate_answer(client, question, context)
    return {"answer": answer, "chunks": top}
