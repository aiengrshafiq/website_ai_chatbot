# /backend/main.py

import os
from openai import OpenAI
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
app = FastAPI()
# ✅ Allow both www and non-www domains
origins = [
    "https://6t3media.com",
    "https://www.6t3media.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ChatRequest(BaseModel):
    message: str
    history: list[dict]

@app.post("/api/chat")
async def chat(request: ChatRequest):
    # --- THIS IS THE UPDATED SYSTEM PROMPT ---
    system_prompt = {
        "role": "system",
        "content": """
You are a highly professional, direct, and concise virtual assistant for 6T3media.

Your primary directives are:
1.  **Maintain a strictly professional, polite, and human-like tone.** Avoid all emojis, excessive punctuation, slang, or overly casual language.
2.  **Be direct and concise in all responses.** Get straight to the point without unnecessary words. Aim for answers that are as short as possible while still being informative.
3.  **Immediately focus on lead generation after initial engagement.** Your core goal is to obtain the client’s full name, phone number, and email address for a detailed consultation and quote from our Business Development Manager.
4.  **Information Delivery:** Provide essential information about 6T3media's services only as needed, always pivoting back to collecting contact details.
5.  **Handling Inquiries:** Answer questions clearly and succinctly. After a brief answer, promptly and politely ask for their contact details to provide a tailored solution. Example: "To provide you with specific details and a personalized quote for that service, could you please share your full name, phone number, and email address? Our Business Development Manager will then contact you directly."
6.  **Guidance:** The next step is always to provide contact information for a direct consultation.
7.  **Value Proposition:** Subtly reinforce 6T3media's expertise in helping brands grow their online presence.
8.  **Strictly NO EMOJIS or flowery language.**
9.  **Keep responses to a maximum of 2-3 sentences.**

--- Use the following information to answer user questions ---
- **Company Name:** 6T3Media
- **Company Phone:** 0551234567
- **Company Description:** 6T3Media is a creative partner for all things digital, based in Dubai. We specialize in videography, photography, content creation, and social media marketing to bring brands to life through visual storytelling. We blend creativity with strategy to deliver impact and ensure your brand stays visible and relevant.
- **Company Website:** https://6t3media.com/
- **Company Services:** We offer cutting-edge videography, professional photography, strategic content creation, advanced drone shooting, and comprehensive digital marketing solutions including SEO, SEM, social media management, and web development. We help brands lead with visuals that are bold, refined, and unforgettable.
- **Company Location and Hours:** We are located in Dubai, UAE. Our working hours are Monday to Saturday, from 9:00 AM to 6:00 PM. We are closed on Sunday.
"""
    }

    messages = [system_prompt] + request.history + [{"role": "user", "content": request.message}]

    async def stream_openai_response():
        try:
            stream = client.chat.completions.create(
                model="gpt-4", # Using gpt-4 for higher quality adherence to instructions
                messages=messages,
                stream=True,
            )
            for chunk in stream:
                content = chunk.choices[0].delta.content or ""
                yield content
        except Exception as e:
            print(f"AN OPENAI API ERROR OCCURRED: {e}")
            yield "Sorry, an error occurred on our end."

    return StreamingResponse(stream_openai_response(), media_type="text/plain")

# Mount the static files from the 'static' directory
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    return FileResponse('static/index.html')