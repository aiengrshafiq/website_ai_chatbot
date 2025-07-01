# /backend/main.py

import os
from openai import OpenAI
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles # Import StaticFiles
from fastapi.responses import FileResponse # Import FileResponse
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

# NO MORE CORS NEEDED! We can remove the CORS middleware.

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ChatRequest(BaseModel):
    message: str
    history: list[dict]

class ChatResponse(BaseModel):
    reply: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    system_prompt = {
        "role": "system",
        "content": "You are a friendly and highly knowledgeable assistant for 'Dubai Web Experts'. Your goal is to be helpful, polite, and efficient. Answer user questions clearly and concisely. If a user seems interested in services, politely ask if they would like to leave their contact details for a quote."
    }
    messages = [system_prompt] + request.history + [{"role": "user", "content": request.message}]

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=150
        )
        bot_reply = response.choices[0].message.content
        return ChatResponse(reply=bot_reply)
    except Exception as e:
        # This will print the full, detailed error to your Azure logs
        print(f"AN OPENAI API ERROR OCCURRED: {e}")
        # Still return a generic message to the user for security
        return ChatResponse(reply="Sorry, something went wrong on my end. Please try again in a moment.")

# Mount the static files from the 'static' directory
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    return FileResponse('static/index.html')