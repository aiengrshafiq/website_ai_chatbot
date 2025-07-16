# /backend/main.py - FINAL PRODUCTION VERSION

import os
import httpx 
import json
import logging
from openai import AsyncOpenAI
from pydantic import BaseModel
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# --- Initial Setup ---
load_dotenv()
app = FastAPI()

# --- Logging Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Rate Limiting Configuration ---
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS Configuration ---
origins = ["https://6t3media.com", "https://www.6t3media.com"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- API Clients & Secrets ---
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
PIPEDRIVE_API_TOKEN = os.getenv("PIPEDRIVE_API_TOKEN")
PIPEDRIVE_DOMAIN = os.getenv("PIPEDRIVE_DOMAIN")

# --- NEW SLACK CONFIGURATION ---
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

# --- Pydantic Models ---
class ChatRequest(BaseModel):
    message: str
    history: list[dict]

# --- Pipedrive Manager Class ---
class PipedriveManager:
    def __init__(self, domain, token):
        self.base_url = f"https://{domain}.pipedrive.com/api/v1"
        self.api_token = token

    async def _find_person(self, field: str, value: str) -> int | None:
        async with httpx.AsyncClient() as http_client:
            search_url = f"{self.base_url}/persons/search"
            params = {"term": value, "fields": field, "exact_match": True, "api_token": self.api_token}
            response = await http_client.get(search_url, params=params)
            if response.status_code == 200:
                items = response.json().get("data", {}).get("items", [])
                if items:
                    person_id = items[0]["item"]["id"]
                    logging.info(f"Found existing person by {field}. ID: {person_id}")
                    return person_id
            return None

    async def _create_person(self, name: str, email: str, phone: str) -> int | None:
        async with httpx.AsyncClient() as http_client:
            create_url = f"{self.base_url}/persons?api_token={self.api_token}"
            person_payload = {"name": name, "email": [email], "phone": [phone]}
            response = await http_client.post(create_url, json=person_payload)
            if response.status_code == 201:
                person_id = response.json()["data"]["id"]
                logging.info(f"Created new person. ID: {person_id}")
                return person_id
            return None

    async def get_or_create_person_and_deal(self, name: str, email: str, phone: str) -> str:
        if not self.api_token or not self.base_url:
            logging.error("Pipedrive environment variables are not configured.")
            return "CRM is not configured."
        try:
            person_id = await self._find_person("email", email)
            if not person_id:
                person_id = await self._find_person("phone", phone)
            if not person_id:
                person_id = await self._create_person(name, email, phone)
            if not person_id:
                logging.error("Failed to find or create a person in Pipedrive.")
                return "Failed to save contact in CRM."
            async with httpx.AsyncClient() as http_client:
                deal_payload = {"title": f"{name} - Chatbot Lead", "person_id": person_id}
                deal_res = await http_client.post(f"{self.base_url}/deals?api_token={self.api_token}", json=deal_payload)
                deal_res.raise_for_status()
                deal_id = deal_res.json()["data"]["id"]
                logging.info(f"Successfully created deal with ID: {deal_id} for person ID: {person_id}")
                return f"Successfully created a deal for {name} in the CRM."
        except httpx.HTTPStatusError as e:
            logging.error(f"Pipedrive API HTTP Error: {e.response.text}")
            return "Failed to communicate with CRM due to a server error."
        except Exception as e:
            logging.error(f"An unexpected error occurred with Pipedrive: {e}")
            return "An unexpected error occurred while saving to CRM."

pipedrive_manager = PipedriveManager(PIPEDRIVE_DOMAIN, PIPEDRIVE_API_TOKEN)

# --- NEW SLACK NOTIFIER ---
async def send_slack_notification(name: str, email: str, phone: str):
    """Asynchronously sends a notification to a Slack channel using a webhook."""
    if not SLACK_WEBHOOK_URL:
        logging.warning("SLACK_WEBHOOK_URL not configured. Skipping Slack notification.")
        return

    message = {
        "text": (
            f"*New Lead from Website Chatbot* 🤖\n\n"
            f"*Name:* {name}\n"
            f"*Email:* {email}\n"
            f"*Phone:* {phone}\n"
            f"*Source:* Website Chatbot"
        )
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(SLACK_WEBHOOK_URL, json=message)
            response.raise_for_status()
            logging.info("Successfully sent lead notification to Slack.")
    except httpx.HTTPStatusError as e:
        logging.error(f"Failed to send Slack notification. Status: {e.response.status_code}")
    except Exception as e:
        logging.error(f"An unexpected error occurred sending Slack notification: {e}")


# --- Main Chat Endpoint with Rate Limiting ---
@app.post("/api/chat")
@limiter.limit("5/minute")
async def chat(request: Request):
    json_body = await request.json()
    chat_request = ChatRequest(**json_body)

    system_prompt = {
        "role": "system",
        "content": """
You are a highly professional, direct, and concise virtual assistant for 6T3media.

Your primary goal is to obtain the client’s full name, phone number, and email address. Once you have all three pieces of information, your job is complete, and you must use the `create_pipedrive_deal` function. Do not ask for permission; use the function as soon as the criteria are met.

After using the function, confirm to the user that their details have been received and someone will be in touch.

--- Rules & Information ---
- Be direct and concise. Keep responses to 2-3 sentences.
- The next step is always to provide contact information for a consultation.
- Strictly NO EMOJIS.
- Company Name: 6T3Media
- Company Phone: 0551234567
- Company Description: 6T3Media is a creative partner for all things digital, based in Dubai. We specialize in videography, photography, content creation, and social media marketing to bring brands to life through visual storytelling. We blend creativity with strategy to deliver impact and ensure your brand stays visible and relevant.
- Company Website: https://6t3media.com/
- Services: We offer cutting-edge videography, professional photography, strategic content creation, advanced drone shooting, and comprehensive digital marketing solutions including SEO, SEM, social media management, and web development. We help brands lead with visuals that are bold, refined, and unforgettable.
- Location: Dubai, UAE
"""
    }
    messages = [system_prompt] + chat_request.history + [{"role": "user", "content": chat_request.message}]
    tools = [
        {"type": "function","function": {"name": "create_pipedrive_deal","description": "Create a new deal in the Pipedrive CRM when you have the user's full name, email, and phone number.","parameters": {"type": "object","properties": {"name": {"type": "string"}, "email": {"type": "string"}, "phone": {"type": "string"}}, "required": ["name", "email", "phone"]}}}
    ]

    try:
        response = await client.chat.completions.create(model="gpt-4", messages=messages, tools=tools, tool_choice="auto")
        response_message = response.choices[0].message

        if response_message.tool_calls:
            tool_call = response_message.tool_calls[0]
            if tool_call.function.name == "create_pipedrive_deal":
                args = json.loads(tool_call.function.arguments)
                tool_response = await pipedrive_manager.get_or_create_person_and_deal(
                    name=args.get("name"), email=args.get("email"), phone=args.get("phone")
                )

                # --- NEW: Send Slack Notification ---
                # After a successful Pipedrive entry, send a notification to Slack.
                if "Successfully created" in tool_response:
                    await send_slack_notification(name=args.get("name"), email=args.get("email"), phone=args.get("phone"))
                
                messages.append(response_message)
                messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": "create_pipedrive_deal", "content": tool_response})
                
                final_response = await client.chat.completions.create(model="gpt-4", messages=messages)
                final_message_content = final_response.choices[0].message.content
                
                async def stream_final_response(): yield final_message_content
                return StreamingResponse(stream_final_response(), media_type="text/plain")

        async def stream_regular_response():
            stream = await client.chat.completions.create(model="gpt-4", messages=messages, stream=True)
            async for chunk in stream:
                content = chunk.choices[0].delta.content or ""
                yield content
        return StreamingResponse(stream_regular_response(), media_type="text/plain")

    except Exception as e:
        logging.error(f"OpenAI API or other error in chat endpoint: {e}")
        async def stream_error(): yield "Sorry, an error occurred on our end."
        return StreamingResponse(stream_error(), media_type="text/plain")

# --- Static File Serving ---
app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
async def read_root():
    return FileResponse('static/index.html')