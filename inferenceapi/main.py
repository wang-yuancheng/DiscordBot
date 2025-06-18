from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class EchoPayload(BaseModel):
    message: str

@app.get("/")
def test():
    return {"Hello World!"}

@app.post("/echo")
async def echo(data: EchoPayload):
    return {"Received": data.message}