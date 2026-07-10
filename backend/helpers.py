# helpers.py — funzioni di utilità condivise tra i router

import os
import bcrypt
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models import User, Item

# Config condivisa per le chiamate al LLM Groq (usata da routers_ai_recipe.py e routers_ai_agent.py)
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


# Hashing password per il login "rivendica una personH" (vedi routers_auth.py).
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


def require_groq_key() -> str:
    """Legge la API key Groq dall'env; solleva 500 se non configurata."""
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="API key mancante")
    return key


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
