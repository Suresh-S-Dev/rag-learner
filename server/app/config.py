import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DB_PATH = ROOT / "data" / "rag.sqlite"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
TOP_K = 5
BEDROCK_REGION = os.getenv("BEDROCK_REGION", os.getenv("AWS_REGION", "us-east-1"))
EMBED_MODEL = os.getenv("BEDROCK_EMBED_MODEL", "amazon.titan-embed-text-v2:0")
CHAT_MODEL = os.getenv("BEDROCK_CHAT_MODEL", "us.anthropic.claude-sonnet-5")
GALLERY_DIR = ROOT / "data" / "gallery"
ALLOWED_SUFFIXES = {".txt", ".md", ".pdf", ".docx"}
ALLOWED_IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
CORS_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]
