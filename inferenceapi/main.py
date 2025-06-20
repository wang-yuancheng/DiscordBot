from typing import Optional, Dict, Any
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class MessageEntry(BaseModel):
    messageID: str
    content: str
    authorID: str
    authorUsername: str
    authorTimeInServer: Optional[str] = None  # may be "unknown" if member has left
    channelID: str
    channelName: str
    guildID: str
    guildName: str
    createdTimestamp: str                     # milliseconds since 1970-01-01

@app.get("/")
def health():
    return {"status": "alive"}

@app.post("/echoold")
async def echo(entry: MessageEntry) -> Dict[str, Any]:
    return {"received": entry.content}  

@app.post("/echo")
async def echo(entry: MessageEntry):
    probability = 0.99
    message = entry.content
    return {"message": message, "verdict": str(2), "probability": str(probability)} 
