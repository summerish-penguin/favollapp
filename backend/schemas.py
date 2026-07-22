# schemas.py — modelli Pydantic per validazione request/response

from typing import List
from pydantic import BaseModel


# ---- Auth ----

class LoginRequest(BaseModel):
    name: str
    password: str


# ---- Warehouse ----

class UpdateRequest(BaseModel):
    user: str
    item: str
    delta: int

class RemoveRequest(BaseModel):
    user: str
    item: str

class CreateItemRequest(BaseModel):
    name: str
    target: int = 1

class UpdateItemRequest(BaseModel):
    name: str
    target: int


# ---- AI Recipe ----

class RecipeRequest(BaseModel):
    prompt: str


# ---- AI Agent ----

class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str

class AgentRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


# ---- Shopping ----

class ShoppingItemRequest(BaseModel):
    day:        str = ""
    ingredient: str
    qty:        str = ""

class ShoppingItemUpdate(BaseModel):
    day:        str = ""
    ingredient: str = ""
    qty:        str = ""


# ---- Playlist ----

class AddTrackRequest(BaseModel):
    spotify_uri: str
    title:       str
    artist:      str = ""
    image_url:   str = ""

class VoteRequest(BaseModel):
    track_id: int
    value:    int          # +1 like / -1 dislike
