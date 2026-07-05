# routers_ai_recipe.py — endpoint /ai/recipe: genera ingredienti via Groq LLM

import json
import requests

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from schemas import RecipeRequest
from helpers import get_user_count, require_groq_key, GROQ_URL, GROQ_MODEL

router = APIRouter()


@router.post("/ai/recipe")
def generate_recipe(req: RecipeRequest, db: Session = Depends(get_db)):
    """
    Riceve un prompt (nome piatto + contesto opzionale) e restituisce
    un JSON con la lista degli ingredienti calibrata sul numero di persone.
    """
    GROQ_API_KEY = require_groq_key()
    people = get_user_count(db)

    system_prompt = f"""Sei un parser di ricette. Input: nome piatto + contesto opzionale. Output: JSON puro.

FORMATO OUTPUT (nessun testo fuori dal JSON, nessun markdown):
{{"ingredients": [{{"name": "string", "quantity": number, "unit": "g|ml|pz"}}]}}

REGOLE:
- Porzioni: {people} persone, quantità medio-abbondanti (pasta: 120g/persona, altri ingredienti in proporzione)
- Se l'utente specifica quantità o varianti, hanno precedenza sulle regole di default
- Nomi sempre in italiano ("onion" → "cipolla")
- Nomi specifici: indica il taglio di carne, il tipo di pomodoro (passata/pelati/polpa/freschi), ecc.
- unit: usa "g" per solidi, "ml" per liquidi, "pz" per elementi interi non pesabili"""

    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": req.prompt}
                ],
                "temperature": 0.3
            }
        )

        data    = response.json()
        content = data["choices"][0]["message"]["content"]

        # Parsing robusto: gestisce testo sporco attorno al JSON
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            start  = content.find("{")
            end    = content.rfind("}") + 1
            parsed = json.loads(content[start:end])

        return parsed

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
