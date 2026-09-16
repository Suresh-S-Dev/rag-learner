# RAG Learner

Personal project for learning Retrieval-Augmented Generation by building each stage by hand.

## Goal

Build a question-answering app for AWS and RAG study notes:

1. Read local documents
2. Split them into chunks
3. Create embeddings
4. Store and search vectors
5. Retrieve relevant chunks for a question
6. Send retrieved context to Amazon Bedrock
7. Generate an answer

## Learning rule

Implement each stage manually before using LangChain, LlamaIndex, Haystack, or similar RAG frameworks.

Allowed now: FastAPI, boto3, numpy, pypdf, python-docx.

## Stack

- Backend: Python, FastAPI, uvicorn, SQLite at `server/data/rag.sqlite`
- Frontend: React, TypeScript, Vite
- LLM: Amazon Bedrock Converse API (`BEDROCK_CHAT_MODEL`, default Claude 3.5 Sonnet)
- Embeddings: Amazon Bedrock Titan (`BEDROCK_EMBED_MODEL`)
- Documents: uploaded files stored in SQLite
- Vectors: stored as JSON in the `embeddings` table, cosine search with numpy

## Layout

```
server/
  app/
    main.py              FastAPI app
    config.py            paths, models, chunk size
    db.py                SQLite
    schemas.py           request models
    routers/             health, documents, ask, gallery, learn
    services/            files, chunking, bedrock, retrieve, pipeline, gallery, suggest
  data/rag.sqlite
  data/gallery/
  requirements.txt
  run.sh
client/src/
  App.tsx
  api/client.ts
  types.ts
  theme.ts
  learn/lessons.ts
  components/            ThemeToggle, DocumentsPanel, ChatPanel, ProfilePanel
                         LearnPanel, GalleryPanel, BottomNav, Atmosphere
                         Icon, Button, Panel, TextArea, EmptyState
```

## API

- `GET /` and `GET /health`
- `POST /ingest` — multipart `files`; returns queued files while chunking and embedding continue in the background
- `GET /documents`
- `GET /documents/{id}`
- `GET /documents/{id}/chunks`
- `DELETE /documents/{id}`
- `POST /ask` — `{ "question": "..." }` returns `{ answer, chunks }`
- `GET /suggest` — one LLM call for exactly 3 questions across all ready documents; cached until that set changes
- `GET /gallery` and `POST /gallery` — image files; `GET /gallery/{id}/file`; `DELETE /gallery/{id}`
- `GET /learn` and `POST /learn` — title, body, optional image (also stored in gallery); `DELETE /learn/{id}`

## How to run

Backend needs AWS credentials that can call Bedrock in `BEDROCK_REGION` (default `us-east-1`).

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./run.sh
```

API: http://127.0.0.1:8005
Docs: http://127.0.0.1:8005/docs

Frontend:

```bash
cd client
npm install
npm run dev
```

## Comments

Do not add comments anywhere: frontend, backend, configs, scripts, or gitignore. No `//`, `#`, `/* */`, or docstrings. Explain things in this file instead of in code.

## Conventions

- Keep new backend code in `server/app/` (routers vs services)
- Do not add RAG frameworks
- Do not commit `.venv`, `node_modules`, `.env`, `server/data/`, or vector indexes
- Verify UI changes in the browser when browser tools are available
- Only commit when the user asks

## Current stage

The pipeline is implemented: ingest, chunk, embed, retrieve, and generate. The UI uses a bottom dock with Home, Documents, Learn, Gallery, and Profile. Learn covers RAG stages and custom notes with optional images that appear in Gallery.
