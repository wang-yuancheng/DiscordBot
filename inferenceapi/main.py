from typing import Optional, Dict, Any
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()

class MessageEntry(BaseModel):
    id: str
    content: str
    authorID: str
    authorUsername: str
    authorTimeInServer: Optional[str] = None  # may be "unknown" if member has left
    channelID: str
    channelName: str
    guildID: str
    guildName: str
    createdTimestamp: int                     # milliseconds since 1970-01-01

@app.get("/")
def health():
    return {"status": "alive"}

@app.post("/echo")
async def echo(entry: MessageEntry) -> Dict[str, Any]:
    return {"received": entry.content}  