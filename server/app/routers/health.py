from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def read_root():
    return {"message": "RAG Learner API is running"}


@router.get("/health")
def health():
    return {"status": "ok"}
