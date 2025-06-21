from typing import Optional, Dict, Any
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class MessageEntry(BaseModel):
    message_ID: str
    author_ID: str
    author_username: str
    channel_ID: str
    channel_name: str
    guild_ID: str
    guild_name: str
    content: str
    msg_timestamp: str                         # milliseconds since 1970-01-01
    joined_timestamp: Optional[str] = None     # may be "unknown" if member has left
    time_since_join: str
    message_length: str
    word_count: str
    has_link: str
    has_mention: str
    num_roles: str
    message_type: str
    

@app.get("/")
def health():
    return {"status": "alive"}

@app.post("/echo")
async def echo(entry: MessageEntry):
    probability = 0.99
    message = entry.content
    return {"message": message, "verdict": str(2), "probability": str(probability)} 

@app.post("/predict")
async def call_model(entry: MessageEntry): 

    if int(entry.word_count) <= 3:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    elif int(entry.message_type) == 1:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    
     # ... otherwise call the ML model and return the prediction

