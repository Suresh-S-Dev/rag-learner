from fastapi import FastAPI

app = FastAPI(title="RAG Learner")


@app.get("/")
def read_root():
    return {"message": "RAG Learner API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
