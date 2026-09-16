import json

import boto3

from app.config import BEDROCK_REGION, CHAT_MODEL, EMBED_MODEL


def bedrock_client():
    return boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)


def embed_text(client, text: str) -> list[float]:
    response = client.invoke_model(
        modelId=EMBED_MODEL,
        body=json.dumps({"inputText": text}),
        contentType="application/json",
        accept="application/json",
    )
    payload = json.loads(response["body"].read())
    embedding = payload.get("embedding")
    if not embedding:
        raise RuntimeError("Bedrock embedding response had no vector")
    return embedding


def generate_suggestions(client, documents: list[tuple[str, str]]) -> list[str]:
    blocks = []
    for name, text in documents:
        snippet = " ".join(text.split())[:1200]
        if snippet:
            blocks.append(f"Document: {name}\n{snippet}")
    notes = "\n\n".join(blocks)
    if not notes:
        return []
    prompt = (
        "Write study questions a learner would ask about the notes below. "
        "Return JSON only in this shape: {\"questions\": [\"q1\", \"q2\", \"q3\"]}. "
        "Exactly 3 short questions in one list. "
        "Use every document. If there are two or more documents, the three questions "
        "must cover more than one document, not a single file. "
        "Use only the notes. No numbering, no markdown.\n\n"
        f"{notes}"
    )
    response = client.converse(
        modelId=CHAT_MODEL,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
    )
    parts = response["output"]["message"]["content"]
    raw = "".join(part.get("text", "") for part in parts).strip()
    return _parse_questions(raw)


def _parse_questions(raw: str) -> list[str]:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    payload = None
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                payload = json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                payload = None
    questions: list[str] = []
    if isinstance(payload, dict):
        value = payload.get("questions", [])
        if isinstance(value, list):
            questions = [str(item).strip() for item in value if str(item).strip()]
    elif isinstance(payload, list):
        questions = [str(item).strip() for item in payload if str(item).strip()]
    if not questions:
        questions = [line.strip(" -•\t") for line in text.splitlines() if line.strip()]
    return questions[:3]


def generate_answer(client, question: str, context: str) -> str:
    prompt = (
        "Answer the question using only the retrieved notes below. "
        "If the notes do not contain the answer, say you do not know. "
        "Write plain text. Do not use markdown, asterisks, or heading marks.\n\n"
        f"Notes:\n{context}\n\n"
        f"Question: {question}"
    )
    response = client.converse(
        modelId=CHAT_MODEL,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
    )
    parts = response["output"]["message"]["content"]
    return "".join(part.get("text", "") for part in parts).strip()
