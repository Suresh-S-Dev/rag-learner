import json
import re

import numpy as np

from app.config import TOP_K
from app.services.bedrock import bedrock_client, embed_text, generate_answer, generate_json, generate_text
from app.services.rag_modes import mode_payload
from app.services.sparse import bm25_scores, entities

CANDIDATE_K = 12
RRF_K = 60
NEED_RE = re.compile(r"\b(what|why|how|when|which|who|where|explain|list|compare|describe)\b", re.I)


def cosine_similarity(left: list[float], right: list[float]) -> float:
    a = np.array(left, dtype=float)
    b = np.array(right, dtype=float)
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def answer_question(question: str, rows, mode: str = "basic", history: list | None = None) -> dict:
    client = bedrock_client()
    items = _items(rows)
    history = history or []
    runners = {
        "basic": _basic,
        "sparse": _sparse,
        "hybrid": _hybrid,
        "hyde": _hyde,
        "multi_query": _multi_query,
        "conversational": _conversational,
        "rerank": _rerank,
        "adaptive": _adaptive,
        "corrective": _corrective,
        "self": _self,
        "multi_hop": _multi_hop,
        "agentic": _agentic,
        "multi_agent": _multi_agent,
        "graph": _graph,
        "branched": _branched,
        "memory": _memory,
    }
    runner = runners.get(mode, _basic)
    return runner(client, question, items, history)


def _items(rows) -> list[dict]:
    items = []
    for index, row in enumerate(rows):
        items.append(
            {
                "i": index,
                "source": row["name"],
                "text": row["text"],
                "vector": json.loads(row["vector"]),
            }
        )
    return items


def _dense(query_vec: list[float], items: list[dict]) -> list[tuple[float, dict]]:
    ranked = [(cosine_similarity(query_vec, item["vector"]), item) for item in items]
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return ranked


def _sparse_rank(question: str, items: list[dict]) -> list[tuple[float, dict]]:
    scores = bm25_scores(question, [item["text"] for item in items])
    ranked = list(zip(scores, items))
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return ranked


def _rrf(*lists: list[tuple[float, dict]]) -> list[tuple[float, dict]]:
    scores: dict[int, float] = {}
    payload: dict[int, dict] = {}
    for ranked in lists:
        for rank, (_score, item) in enumerate(ranked, start=1):
            key = item["i"]
            scores[key] = scores.get(key, 0.0) + 1.0 / (RRF_K + rank)
            payload[key] = item
    order = sorted(scores, key=lambda key: scores[key], reverse=True)
    return [(scores[key], payload[key]) for key in order]


def _chunks(ranked: list[tuple[float, dict]], limit: int = TOP_K) -> list[dict]:
    out = []
    for score, item in ranked[:limit]:
        out.append({"source": item["source"], "score": round(float(score), 4), "text": item["text"]})
    return out


def _context(chunks: list[dict]) -> str:
    return "\n\n".join(f"Source: {item['source']}\n{item['text']}" for item in chunks)


def _pack(mode: str, answer: str, chunks: list[dict], steps: list[str]) -> dict:
    meta = mode_payload(mode)
    return {
        "answer": answer,
        "chunks": chunks,
        "mode": meta["id"],
        "trace": {
            "mode": meta["id"],
            "label": meta["label"],
            "summary": meta["summary"],
            "steps": steps,
        },
    }


def _answer(client, question: str, chunks: list[dict]) -> str:
    if not chunks:
        return generate_text(
            client,
            "The user asked a question but no notes were retrieved. "
            "Say you do not have retrieved notes for this. Invite a more specific question.\n\n"
            f"Question: {question}",
        )
    return generate_answer(client, question, _context(chunks))


def _basic(client, question: str, items: list[dict], _history: list) -> dict:
    query = embed_text(client, question)
    ranked = _dense(query, items)
    chunks = _chunks(ranked)
    steps = [
        "Embedded the question with Titan.",
        f"Ranked chunks by cosine similarity and kept top {len(chunks)}.",
        "Generated an answer from those chunks.",
    ]
    return _pack("basic", _answer(client, question, chunks), chunks, steps)


def _sparse(client, question: str, items: list[dict], _history: list) -> dict:
    ranked = _sparse_rank(question, items)
    chunks = _chunks(ranked)
    steps = [
        "Tokenized the question.",
        f"Scored chunks with BM25 and kept top {len(chunks)}.",
        "Generated an answer from those chunks. No embeddings were used for search.",
    ]
    return _pack("sparse", _answer(client, question, chunks), chunks, steps)


def _hybrid(client, question: str, items: list[dict], _history: list) -> dict:
    query = embed_text(client, question)
    ranked = _rrf(_dense(query, items), _sparse_rank(question, items))
    chunks = _chunks(ranked)
    steps = [
        "Ran dense cosine search.",
        "Ran BM25 keyword search.",
        "Fused both lists with reciprocal rank fusion.",
        f"Kept top {len(chunks)} and generated an answer.",
    ]
    return _pack("hybrid", _answer(client, question, chunks), chunks, steps)


def _hyde(client, question: str, items: list[dict], _history: list) -> dict:
    hypo = generate_text(
        client,
        "Write a short paragraph that would answer this question, as if it came from study notes. "
        "Do not mention that it is hypothetical.\n\n"
        f"Question: {question}",
    )
    query = embed_text(client, hypo)
    chunks = _chunks(_dense(query, items))
    steps = [
        "Wrote a hypothetical answer.",
        f"Hypothetical text: {hypo[:220]}",
        "Embedded that text and retrieved nearest chunks.",
        "Generated the real answer from retrieved notes.",
    ]
    return _pack("hyde", _answer(client, question, chunks), chunks, steps)


def _multi_query(client, question: str, items: list[dict], _history: list) -> dict:
    payload = generate_json(
        client,
        "Rewrite the question into 2 alternative search queries that could find the same facts. "
        f'Return JSON only: {{"queries": ["q1", "q2"]}}.\n\nQuestion: {question}',
    )
    extras = []
    if isinstance(payload, dict):
        raw = payload.get("queries", [])
        if isinstance(raw, list):
            extras = [str(item).strip() for item in raw if str(item).strip()][:2]
    queries = [question, *extras]
    lists = []
    for query in queries:
        lists.append(_dense(embed_text(client, query), items))
    chunks = _chunks(_rrf(*lists))
    steps = [
        f"Search queries: {' | '.join(queries)}",
        "Retrieved for each query and fused the hits.",
        f"Kept top {len(chunks)} and generated an answer.",
    ]
    return _pack("multi_query", _answer(client, question, chunks), chunks, steps)


def _rewrite(client, question: str, history: list) -> str:
    if not history:
        return question
    lines = []
    for turn in history[-4:]:
        lines.append(f"Q: {turn['question']}\nA: {str(turn['answer'])[:240]}")
    text = generate_text(
        client,
        "Rewrite the latest user question as a standalone search query. "
        "Return only the query.\n\n"
        f"{chr(10).join(lines)}\n\nLatest: {question}",
    )
    return text.strip() or question


def _conversational(client, question: str, items: list[dict], history: list) -> dict:
    query_text = _rewrite(client, question, history)
    chunks = _chunks(_dense(embed_text(client, query_text), items))
    steps = [
        f"Rewrote the turn into: {query_text}",
        "Retrieved with the standalone query.",
        "Generated an answer.",
    ]
    return _pack("conversational", _answer(client, question, chunks), chunks, steps)


def _rerank(client, question: str, items: list[dict], _history: list) -> dict:
    wide = _dense(embed_text(client, question), items)[:CANDIDATE_K]
    numbered = []
    for index, (_score, item) in enumerate(wide, start=1):
        numbered.append(f"{index}. {item['text'][:400]}")
    payload = generate_json(
        client,
        "Pick the most relevant note chunks for the question. "
        f'Return JSON only: {{"indexes": [1, 2]}} with at most {TOP_K} 1-based indexes.\n\n'
        f"Question: {question}\n\nChunks:\n" + "\n".join(numbered),
    )
    picked = []
    if isinstance(payload, dict) and isinstance(payload.get("indexes"), list):
        for value in payload["indexes"]:
            try:
                index = int(value)
            except (TypeError, ValueError):
                continue
            if 1 <= index <= len(wide):
                picked.append(wide[index - 1])
    if not picked:
        picked = wide[:TOP_K]
    chunks = _chunks(picked, limit=TOP_K)
    steps = [
        f"Retrieved {len(wide)} candidates with embeddings.",
        "Asked the model to rerank them.",
        f"Kept {len(chunks)} and generated an answer.",
    ]
    return _pack("rerank", _answer(client, question, chunks), chunks, steps)


def _needs_notes(question: str) -> bool:
    cleaned = question.strip()
    if NEED_RE.search(cleaned):
        return True
    return len(cleaned.split()) >= 6


def _adaptive(client, question: str, items: list[dict], _history: list) -> dict:
    if not _needs_notes(question):
        answer = generate_text(
            client,
            "The user sent a short message that may not need notes. "
            "Reply briefly as a notes assistant and invite a real question about the documents.\n\n"
            f"Message: {question}",
        )
        steps = [
            "The question looked like small talk, so retrieval was skipped.",
            "Replied without retrieved chunks.",
        ]
        return _pack("adaptive", answer, [], steps)
    result = _basic(client, question, items, [])
    return _pack(
        "adaptive",
        result["answer"],
        result["chunks"],
        [
            "The question looked like a notes query, so Basic RAG ran.",
            *result["trace"]["steps"],
        ],
    )


def _corrective(client, question: str, items: list[dict], _history: list) -> dict:
    first = _basic(client, question, items, [])
    chunks = first["chunks"]
    check = generate_json(
        client,
        "Does the answer stay faithful to the notes? "
        'Return JSON only: {"ok": true, "reason": "..."}.\n\n'
        f"Question: {question}\nAnswer: {first['answer']}\nNotes:\n{_context(chunks)}",
    )
    ok = True
    reason = ""
    if isinstance(check, dict):
        ok = bool(check.get("ok", True))
        reason = str(check.get("reason", "")).strip()
    if ok:
        steps = [*first["trace"]["steps"], "A check found the answer supported by the notes."]
        return _pack("corrective", first["answer"], chunks, steps)
    follow = reason or question
    extra = _chunks(_dense(embed_text(client, follow), items))
    merged = _unique(chunks + extra)
    answer = _answer(client, question, merged)
    steps = [
        *first["trace"]["steps"],
        f"Check failed: {reason or 'weak support'}.",
        "Retrieved again and regenerated.",
    ]
    return _pack("corrective", answer, merged[:TOP_K], steps)


def _self(client, question: str, items: list[dict], _history: list) -> dict:
    query = embed_text(client, question)
    chunks = _chunks(_dense(query, items))
    look = generate_json(
        client,
        "Do these notes contain enough evidence to answer? "
        'Return JSON only: {"enough": true, "query": "optional follow-up search"}.\n\n'
        f"Question: {question}\nNotes:\n{_context(chunks)}",
    )
    steps = ["Retrieved an initial set of chunks.", "Asked whether the evidence is enough."]
    if isinstance(look, dict) and not look.get("enough", True):
        follow = str(look.get("query") or question).strip()
        extra = _chunks(_dense(embed_text(client, follow), items))
        chunks = _unique(chunks + extra)[:TOP_K]
        steps.append(f"Evidence looked thin, so retrieved again with: {follow}")
    answer = _answer(client, question, chunks)
    judge = generate_json(
        client,
        "Is the answer supported by the notes? "
        'Return JSON only: {"supported": true, "reason": "..."}.\n\n'
        f"Question: {question}\nAnswer: {answer}\nNotes:\n{_context(chunks)}",
    )
    if isinstance(judge, dict) and not judge.get("supported", True):
        reason = str(judge.get("reason") or "The notes do not support a confident answer.")
        steps.append(f"Reflection rejected the draft: {reason}")
        answer = f"I do not know. {reason}"
    else:
        steps.append("Reflection accepted the answer as supported.")
    return _pack("self", answer, chunks, steps)


def _multi_hop(client, question: str, items: list[dict], _history: list) -> dict:
    first = _chunks(_dense(embed_text(client, question), items))
    follow = generate_text(
        client,
        "Given these notes and the question, write one follow-up search query that would find missing facts. "
        "Return only the query.\n\n"
        f"Question: {question}\nNotes:\n{_context(first)}",
    ).strip() or question
    second = _chunks(_dense(embed_text(client, follow), items))
    chunks = _unique(first + second)[:TOP_K]
    steps = [
        "Retrieved a first hop.",
        f"Follow-up query: {follow}",
        "Retrieved a second hop and merged chunks.",
        "Generated an answer from both hops.",
    ]
    return _pack("multi_hop", _answer(client, question, chunks), chunks, steps)


def _agentic(client, question: str, items: list[dict], _history: list) -> dict:
    gathered: list[dict] = []
    steps = []
    for hop in range(2):
        preview = _context(gathered)[:800] if gathered else "None yet."
        payload = generate_json(
            client,
            "You are a retrieval agent. Choose retrieve or answer. "
            'Return JSON only: {"action": "retrieve", "query": "..."} or {"action": "answer"}.\n\n'
            f"Question: {question}\nRetrieved so far:\n{preview}",
        )
        action = ""
        query = question
        if isinstance(payload, dict):
            action = str(payload.get("action", "")).strip().lower()
            query = str(payload.get("query") or question).strip()
        if action != "retrieve" and gathered:
            steps.append("Agent chose to stop retrieving.")
            break
        extra = _chunks(_dense(embed_text(client, query), items), limit=3)
        gathered = _unique(gathered + extra)
        steps.append(f"Agent retrieved with: {query}")
        if hop == 1:
            break
    chunks = gathered[:TOP_K]
    if not chunks:
        chunks = _chunks(_dense(embed_text(client, question), items))
        steps.append("Fell back to a single Basic retrieve.")
    steps.append("Generated an answer from gathered chunks.")
    return _pack("agentic", _answer(client, question, chunks), chunks, steps)


def _multi_agent(client, question: str, items: list[dict], _history: list) -> dict:
    hybrid = _hybrid(client, question, items, [])
    chunks = hybrid["chunks"]
    draft = generate_text(
        client,
        "You are the reasoner. Draft an answer using only these notes. Plain text.\n\n"
        f"Notes:\n{_context(chunks)}\n\nQuestion: {question}",
    )
    check = generate_json(
        client,
        "You are the verifier. Check the draft against the notes. "
        'Return JSON only: {"ok": true, "answer": "final answer"}. '
        "If the draft is wrong, put a corrected answer in answer.\n\n"
        f"Question: {question}\nDraft: {draft}\nNotes:\n{_context(chunks)}",
    )
    answer = draft
    verdict = "accepted"
    if isinstance(check, dict):
        if check.get("answer"):
            answer = str(check["answer"]).strip()
        verdict = "accepted" if check.get("ok", True) else "revised"
    steps = [
        "Retriever ran Hybrid RAG.",
        "Reasoner drafted an answer.",
        f"Verifier {verdict} the draft.",
    ]
    return _pack("multi_agent", answer, chunks, steps)


def _graph(client, question: str, items: list[dict], _history: list) -> dict:
    query_vec = embed_text(client, question)
    q_terms = entities(question)
    ranked = []
    for item in items:
        overlap = len(q_terms & entities(item["text"]))
        dense = cosine_similarity(query_vec, item["vector"])
        ranked.append((overlap * 0.4 + dense, item))
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    chunks = _chunks(ranked)
    steps = [
        f"Extracted query terms: {', '.join(sorted(q_terms)[:12]) or 'none'}.",
        "Scored chunks by shared terms plus cosine similarity.",
        f"Kept top {len(chunks)} and generated an answer.",
    ]
    return _pack("graph", _answer(client, question, chunks), chunks, steps)


def _branched(client, question: str, items: list[dict], _history: list) -> dict:
    query = embed_text(client, question)
    groups: dict[str, list[dict]] = {}
    for item in items:
        groups.setdefault(item["source"], []).append(item)
    merged: list[tuple[float, dict]] = []
    for source, group in groups.items():
        merged.extend(_dense(query, group)[:2])
    merged.sort(key=lambda pair: pair[0], reverse=True)
    chunks = _chunks(_unique_ranked(merged))
    steps = [
        f"Retrieved the top 2 chunks from each of {len(groups)} documents.",
        "Fused the branches by score.",
        f"Kept top {len(chunks)} and generated an answer.",
    ]
    return _pack("branched", _answer(client, question, chunks), chunks, steps)


def _memory(client, question: str, items: list[dict], history: list) -> dict:
    chunks = _chunks(_dense(embed_text(client, question), items))
    memory = []
    for turn in history[-5:]:
        memory.append(f"Earlier Q: {turn['question']}\nEarlier A: {str(turn['answer'])[:280]}")
    extra = "\n\n".join(memory)
    notes = _context(chunks)
    if extra:
        notes = f"Session memory:\n{extra}\n\nRetrieved notes:\n{notes}"
    answer = generate_answer(client, question, notes)
    steps = [
        f"Loaded {len(memory)} earlier turns as memory." if memory else "No earlier turns to load.",
        "Retrieved notes with Basic RAG.",
        "Generated an answer using memory plus chunks.",
    ]
    return _pack("memory", answer, chunks, steps)


def _unique(chunks: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for item in chunks:
        key = (item["source"], item["text"])
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def _unique_ranked(ranked: list[tuple[float, dict]]) -> list[tuple[float, dict]]:
    seen = set()
    out = []
    for score, item in ranked:
        if item["i"] in seen:
            continue
        seen.add(item["i"])
        out.append((score, item))
    return out
