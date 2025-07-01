# /backend/main.py

import os
from openai import OpenAI
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file for local development
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# --- CORS Configuration ---
# This allows your front-end (on a different domain) to talk to this back-end.
# In production, you should restrict this to your specific domain for better security.
origins = ["*"]  # For development, allow all. For production, change to ["https://your-frontend-domain.com"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- OpenAI Client Initialization ---
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- Pydantic Models for Request/Response ---
# These models ensure that the data coming in and out of your API is structured correctly.
class ChatRequest(BaseModel):
    message: str
    history: list[dict]

class ChatResponse(BaseModel):
    reply: str

# --- API Endpoint ---
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Receives a user message and chat history, gets a response from OpenAI,
    and returns it to the front-end.
    """
    try:
        # The system prompt sets the personality and instructions for the chatbot.
        system_prompt = {
            "role": "system",
            "content": "You are a friendly and highly knowledgeable assistant for 'Dubai Web Experts'. Your goal is to be helpful, polite, and efficient. Answer user questions clearly and concisely. If a user seems interested in services, politely ask if they would like to leave their contact details for a quote."
        }

        # Combine the system prompt with the current chat history and the new message
        messages = [system_prompt] + request.history + [{"role": "user", "content": request.message}]

        # Call the OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",  # Or "gpt-3.5-turbo" for a faster, cheaper option
            messages=messages,
            temperature=0.7, # A little creativity
            max_tokens=150
        )

        bot_reply = response.choices[0].message.content
        return ChatResponse(reply=bot_reply)

    except Exception as e:
        print(f"An error occurred: {e}")
        return ChatResponse(reply="Sorry, something went wrong on my end. Please try again in a moment.")

# --- Root Endpoint for Health Check ---
@app.get("/")
def read_root():
    return {"status": "API is running"}