from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    mode: str = "basic"
