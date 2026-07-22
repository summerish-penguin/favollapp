# helpers.py — funzioni di utilità condivise tra i router

import base64
import os
import time

import bcrypt
import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models import User, Item

# Config condivisa per le chiamate al LLM Gemini (usata da routers_ai_recipe.py e routers_ai_agent.py)
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
GEMINI_MODEL = "gemini-3.5-flash"

# Config Spotify (usata da routers_playlist.py per l'autocomplete di ricerca brani)
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search"

# Cache in memoria del token app (Client Credentials): { "token": str, "exp": float }.
# Evita di richiedere un nuovo token a ogni ricerca; il token Spotify dura ~1h.
_spotify_token_cache: dict = {}


# Hashing password per il login "rivendica una persona" (vedi routers_auth.py).
# bcrypt lavora su max 72 byte: tronchiamo lì, come da prassi, così anche
# password lunghe non sollevano errori.
def _pw_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    """Restituisce l'hash bcrypt della password in chiaro."""
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verifica una password in chiaro contro il suo hash bcrypt."""
    return bcrypt.checkpw(_pw_bytes(password), password_hash.encode("utf-8"))


def require_gemini_key() -> str:
    """Legge la API key Gemini dall'env; solleva 500 se non configurata."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="API key mancante")
    return key


def get_spotify_app_token() -> str:
    """Restituisce un token app Spotify (Client Credentials flow), con cache.

    Legge SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET dall'env; solleva 500 se
    mancanti. Il token permette solo endpoint pubblici (ricerca), non tocca
    dati utente: nessun consenso OAuth richiesto.
    """
    now = time.time()
    cached = _spotify_token_cache.get("token")
    if cached and _spotify_token_cache.get("exp", 0) > now:
        return cached

    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Credenziali Spotify mancanti")

    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    resp = requests.post(
        SPOTIFY_TOKEN_URL,
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "client_credentials"},
        timeout=10,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Autenticazione Spotify fallita")

    data = resp.json()
    token = data["access_token"]
    # Rinnoviamo con 60s di margine rispetto alla scadenza dichiarata
    _spotify_token_cache["token"] = token
    _spotify_token_cache["exp"] = now + data.get("expires_in", 3600) - 60
    return token


def get_or_create_user(db: Session, name: str) -> User:
    """Restituisce l'utente con il nome dato, creandolo se non esiste."""
    user = db.query(User).filter_by(name=name).first()
    if not user:
        user = User(name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_or_create_item(db: Session, name: str) -> Item:
    """Restituisce l'item con il nome dato, creandolo se non esiste."""
    item = db.query(Item).filter_by(name=name).first()
    if not item:
        item = Item(name=name, target=1)
        db.add(item)
        db.commit()
        db.refresh(item)
    return item


def get_user_count(db: Session) -> int:
    """Restituisce il numero totale di utenti registrati."""
    return db.query(User).count()
