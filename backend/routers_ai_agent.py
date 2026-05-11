# =============================================================================
# ROUTERS_AI_AGENT.PY
# Endpoint: POST /ai/agent
#
# Riceve:
#   - message  : str          — messaggio corrente dell'utente
#   - history  : list[dict]   — cronologia della conversazione
#                               formato: [{"role": "user"|"assistant", "content": "..."}]
#
# Restituisce:
#   - reply    : str          — risposta del modello
# =============================================================================

import os
import requests

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from db import SessionLocal
from models import Location, Item, User

router = APIRouter()


# ── Schema ─────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str

class AgentRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


# ── DB ─────────────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── System prompt ──────────────────────────────────────────────────────────

def build_system_prompt(locations: list, items: list, users: list) -> str:
    """
    Costruisce il system prompt iniettando i dati dinamici dal db
    (luoghi vicini, distanze, oggetti in comune, utenti) e il contesto fisso della vacanza.
    """

    # Formatta i luoghi per categoria
    grouped = {}
    for loc in locations:
        cat = loc.category or "altro"
        grouped.setdefault(cat, []).append(loc)

    CATEGORY_LABELS = {
        "home":        "🏠 Casa",
        "supermarket": "🛒 Supermercati",
        "beach":       "🏖️ Spiagge",
        "gas":         "⛽ Benzinai",
        "pharmacy":    "💊 Farmacie",
        "atm":         "🏧 Bancomat",
    }

    locations_block = ""
    for cat, locs in grouped.items():
        label = CATEGORY_LABELS.get(cat, cat)
        locations_block += f"\n{label}:\n"
        for l in locs:
            mins = f" ({l.mins_away} min in auto)" if l.mins_away else ""
            locations_block += f"  - {l.name}{mins}\n"
            
    warehouse_block = "OGGETTI IN COMUNE CHE ABBIAMO PORTATO:\n"
    for i in items:
        qty = f" (x{i.quantity})" if hasattr(i, "quantity") and i.quantity else ""
        warehouse_block += f"  - {i.name}{qty}\n"
        
    users_block = "PERSONE DEL GRUPPO:\n"
    for u in users:
        desc = f" — {u.desc}" if hasattr(u, "desc") and u.desc else ""
        users_block += f"  - {u.name}{desc}\n"        
    
    return f"""Sei un assistente AI integrato in FavollApp, un'applicazione di gruppo per organizzare una vacanza insieme.

CONTESTO VACANZA:
- Destinazione: Montbarbat, Catalogna (Spagna)
- Periodo: 13–20 agosto 2026
- Gruppo: 16 persone
- La casa si trova a Montbarbat, nell'entroterra della Costa Brava

UTILIZZI ATTESI:
Gli utenti ti faranno domande pratiche e spontanee legate alla vacanza, per esempio:
- Cosa si può fare oggi o in un determinato giorno
- Quale spiaggia scegliere (affollamento, fondale, servizi, distanza)
- Cosa c'è da vedere nei dintorni (borghi, mercati, escursioni, attrazioni)
- Consigli su dove mangiare, cosa comprare, cosa portare
- Domande logistiche (supermercati, orari, distanze, parcheggi, benzinai)
- Attività alternative in caso di pioggia

KNOWLEDGE BASE:
- LUOGHI VICINI ALLA CASA:
{locations_block}
- OGGETTI IN COMUNE CHE ABBIAMO PORTATO:
{warehouse_block}
- PERSONE DEL GRUPPO:
{users_block}

TONO E STILE:
- Rispondi in italiano, in modo amichevole, diretto e conciso
- Siamo un gruppo di amici in vacanza, non turisti formali
- Se non sai qualcosa con certezza, dillo chiaramente invece di inventare
- Per le spiagge o i luoghi, usa i nomi presenti nella knowledge base quando disponibili
- Risposte brevi se la domanda è semplice; più dettagliate se la domanda lo richiede
- Per elenchi, formattazione, grassetto, corsivo, organizzazione della risposta, rispondi con sintassi markdown"""


# ── Endpoint ───────────────────────────────────────────────────────────────

@router.post("/ai/agent")
def agent_chat(req: AgentRequest, db: Session = Depends(get_db)):
    """
    Chatbot conversazionale con memoria della sessione.
    Il frontend passa l'intera history ad ogni messaggio.
    """
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="API key mancante")

    # Carica i luoghi, gli oggetti in comune e gli utenti dal db per il system prompt
    locations = db.query(Location).all()
    items = db.query(Item).all()
    users = db.query(User).all()
    system_prompt = build_system_prompt(locations, items, users)

    # Costruisce i messaggi: system + history + nuovo messaggio
    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type":  "application/json"
            },
            json={
                "model":       "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages":    messages,
                "temperature": 0.6,    # un po' più creativo rispetto al parser ricette
                "max_tokens":  1024
            }
        )

        data  = response.json()
        reply = data["choices"][0]["message"]["content"]
        return {"reply": reply}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))