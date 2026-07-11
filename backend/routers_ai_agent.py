# routers_ai_agent.py — endpoint POST /ai/agent: chatbot con memoria di conversazione
# Riceve message (str) + history (lista di {"role", "content"}), restituisce reply (str)

from datetime import date

import requests

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import Location, Item, User
from schemas import AgentRequest
from helpers import require_groq_key, GROQ_URL, GROQ_MODEL

router = APIRouter()


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
        "home":           "🏠 Casa",
        "supermarket":    "🛒 Supermercati",
        "beach":          "🏖️ Spiagge",
        "gas":            "⛽ Benzinai",
        "pharmacy":       "💊 Farmacie",
        "atm":            "🏧 Bancomat",
        "park_barcelona": "🅿️ Parcheggi Barcellona",
    }

    # I blocchi contengono solo le liste indentate: i titoli stanno nel template sotto
    locations_block = ""
    for cat, locs in grouped.items():
        label = CATEGORY_LABELS.get(cat, cat)
        locations_block += f"\n{label}:\n"
        for l in locs:
            mins = f" ({l.mins_away} min in auto)" if l.mins_away else ""
            locations_block += f"  - {l.name}{mins}\n"

    warehouse_block = ""
    for i in items:
        warehouse_block += f"  - {i.name}\n"

    users_block = ""
    for u in users:
        desc = f" — {u.desc}" if hasattr(u, "desc") and u.desc else ""
        users_block += f"  - {u.name}{desc}\n"

    people = len(users)
    oggi = date.today().strftime("%d/%m/%Y")

    return f"""Sei FavollAgent, l'assistente AI di FavollApp, l'app con cui un gruppo di amici organizza una vacanza insieme.

CONTESTO VACANZA
- Destinazione: Montbarbat, Catalogna (Spagna), entroterra della Costa Brava
- Periodo: 12–20 agosto 2026
- Gruppo: {people} persone
- Oggi è {oggi}

COSA TI CHIEDONO
Domande pratiche e spontanee sulla vacanza: cosa fare oggi o in un certo giorno, quale spiaggia scegliere (affollamento, fondale, servizi, distanza), cosa vedere nei dintorni (borghi, mercati, escursioni), dove mangiare o fare la spesa, logistica (supermercati, orari, distanze, parcheggi, benzinai), alternative in caso di pioggia.

KNOWLEDGE BASE (usa questi dati, non inventarne altri)
- LUOGHI VICINI ALLA CASA:
{locations_block}
- OGGETTI IN COMUNE GIÀ PORTATI:
{warehouse_block}
- PERSONE DEL GRUPPO:
{users_block}

TONO E STILE
- Rispondi in italiano: semplice, diretto e conciso. Siamo amici in vacanza, non turisti formali.
- Brevi se la domanda è semplice, più dettagliate quando serve.
- Usa nomi e distanze della knowledge base quando disponibili; per spiagge/luoghi preferisci quelli elencati.
- Se non sai qualcosa con certezza (orari, prezzi, meteo, luoghi non in lista), dillo invece di inventare; non promettere dati che non hai.
- Formatta con markdown (grassetto, elenchi) quando migliora la leggibilità."""


@router.post("/ai/agent")
def agent_chat(req: AgentRequest, db: Session = Depends(get_db)):
    """
    Chatbot conversazionale con memoria della sessione.
    Il frontend passa l'intera history ad ogni messaggio.
    """
    GROQ_API_KEY = require_groq_key()

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
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type":  "application/json"
            },
            json={
                "model":       GROQ_MODEL,
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