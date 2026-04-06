from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import requests

from db import engine, SessionLocal
from models import Base, User, Item, Contribution, ShoppingItem, Location

app = FastAPI()

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://summerish-penguin.github.io",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# DB INIT
# =========================
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =========================
# SCHEMAS
# =========================

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

class RecipeRequest(BaseModel):
    prompt: str

class ShoppingItemRequest(BaseModel):
    day:        str = ""
    ingredient: str
    qty:        str = ""    

class ShoppingItemUpdate(BaseModel):
    day:        str = ""
    ingredient: str = ""
    qty:        str = ""


# =========================
# HELPERS
# =========================

def get_or_create_user(db, name):
    user = db.query(User).filter_by(name=name).first()
    if not user:
        user = User(name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_or_create_item(db, name):
    item = db.query(Item).filter_by(name=name).first()
    if not item:
        item = Item(name=name, target=1)
        db.add(item)
        db.commit()
        db.refresh(item)
    return item

def get_user_count(db: Session):
    return db.query(User).count()


# =========================
# ENDPOINTS
# =========================

@app.api_route("/warehouse", methods=["GET", "HEAD"])
def get_warehouse(request: Request):
    if request.method == "HEAD":
        return

    db = SessionLocal()
    try:
        items = db.query(Item).all()
        result = []

        for item in items:
            contributions = db.query(Contribution).filter_by(item_id=item.id).all()

            users = []
            total = 0

            for c in contributions:
                user = db.get(User, c.user_id)
                users.append({"name": user.name, "qty": c.quantity})
                total += c.quantity

            result.append({
                "name":   item.name,
                "target": item.target,
                "total":  total,
                "users":  users
            })

        return result

    finally:
        db.close()


@app.post("/warehouse/update")
def update(data: UpdateRequest, db: Session = Depends(get_db)):
    item  = get_or_create_item(db, data.item)
    user  = get_or_create_user(db, data.user)

    entry = db.query(Contribution).filter_by(
        user_id=user.id,
        item_id=item.id
    ).first()

    if not entry:
        entry = Contribution(user_id=user.id, item_id=item.id, quantity=0)
        db.add(entry)

    entry.quantity += data.delta

    if entry.quantity <= 0:
        db.delete(entry)

    db.commit()

    return {"ok": True, "target": item.target}


@app.post("/warehouse/remove")
def remove(req: RemoveRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(name=req.user).first()
        item = db.query(Item).filter_by(name=req.item).first()

        if not user or not item:
            return {"ok": True}

        contrib = db.query(Contribution).filter_by(
            user_id=user.id,
            item_id=item.id
        ).first()

        if contrib:
            db.delete(contrib)
            db.commit()

        return {"ok": True}

    finally:
        db.close()

@app.delete("/items/{name}")
def delete_item(name: str, db: Session = Depends(get_db)):
    item = db.query(Item).filter_by(name=name).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item non trovato.")

    # elimina anche tutti i contributi associati
    db.query(Contribution).filter_by(item_id=item.id).delete()
    db.delete(item)
    db.commit()

    return {"ok": True}


@app.post("/ai/recipe")
def generate_recipe(req: RecipeRequest, db: Session = Depends(get_db)):
    try:
        people = get_user_count(db)

        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        if not GROQ_API_KEY:
            raise HTTPException(status_code=500, detail="API key mancante")

        system_prompt = f"""
Sei un assistente che genera ingredienti per ricette.

OBIETTIVO:
Dato un piatto, restituisci SOLO un JSON valido con ingredienti e quantità.

REGOLE:
- Considera {people} persone
- Output SOLO JSON (niente testo)
- Formato:
{{
  "ingredients": [
    {{"name": "nome", "quantity": numero, "unit": "g|ml|pz"}}
  ]
}}
- Usa nomi semplici
- Quantità realistiche
- NIENTE spiegazioni
- Qualora trovassi nomi degli ingredienti in altre lingue, traduci sempre in italiano (per esempio "onion" --> "cipolla")
- Considera eventuale contesto dato dall'utente assieme alla ricetta per adattare l'output (per esempio rispetto a varianti della ricetta o quantità)
- Se il prompt dell'utente non specifica diversamente, considera che le quantità vanno tarate tra il medio e l'abbondante. Per esempio, per la pasta: 120 grammi a persona. Le quantità degli altri ingredienti siano scalate in proporzione
- cerca di essere specifico rispetto agli ingredienti, per esempio: "carne di manzo" --> indica quale taglio di carne se possibile; "pomodoro" --> indica se passata, pelati, polpa, pomodori freschi interi, ecc.
"""

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": req.prompt}
                ],
                "temperature": 0.3
            }
        )

        data = response.json()

        content = data["choices"][0]["message"]["content"]

        # 🔥 Parsing sicuro JSON (gestisce anche eventuale testo sporco)
        import json
        try:
            parsed = json.loads(content)
        except:
            # fallback: prova a estrarre JSON
            start = content.find("{")
            end = content.rfind("}") + 1
            parsed = json.loads(content[start:end])
        
        print("People:", people)
        return parsed

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/shopping")
def save_shopping_item(req: ShoppingItemRequest, db: Session = Depends(get_db)):
    if not req.ingredient.strip():
        raise HTTPException(status_code=422, detail="Ingrediente obbligatorio.")
    item = ShoppingItem(day=req.day, ingredient=req.ingredient, qty=req.qty)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"ok": True, "id": item.id}


@app.get("/shopping")
def get_shopping_items(db: Session = Depends(get_db)):
    items = db.query(ShoppingItem).order_by(ShoppingItem.id).all()
    return [
        {"id": item.id, "day": item.day, "ingredient": item.ingredient, "qty": item.qty}
        for item in items
    ]

@app.delete("/shopping/{id}")
def delete_shopping_item(id: int, db: Session = Depends(get_db)):
    item = db.query(ShoppingItem).filter_by(id=id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item non trovato.")
    db.delete(item)
    db.commit()
    return {"ok": True}

@app.put("/shopping/{id}")
def update_shopping_item(id: int, req: ShoppingItemUpdate, db: Session = Depends(get_db)):
    item = db.query(ShoppingItem).filter_by(id=id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item non trovato.")
    item.day        = req.day
    item.ingredient = req.ingredient
    item.qty        = req.qty
    db.commit()
    return {"ok": True}

@app.delete("/shopping")
def clear_shopping(db: Session = Depends(get_db)):
    db.query(ShoppingItem).delete()
    db.commit()
    return {"ok": True}

# =========================
# CREA NUOVO ITEM
# Chiamato dal modal "Aggiungi oggetto" nel frontend.
# Restituisce errore 409 se l'item esiste già.
# =========================

@app.post("/items")
def create_item(req: CreateItemRequest, db: Session = Depends(get_db)):
    existing = db.query(Item).filter_by(name=req.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Item già esistente.")

    if req.target < 1:
        raise HTTPException(status_code=422, detail="Il target deve essere almeno 1.")

    new_item = Item(name=req.name, target=req.target)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {"ok": True, "name": new_item.name, "target": new_item.target}


@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.name).all()
    return [{"name": u.name, "desc": u.desc, "icon": u.icon} for u in users]


@app.get("/health")
def health():
    return {"status": "ok"}


# =========================
# SEED
# =========================

SEED_ITEMS = [
    ("Ombrellone",        6),
    ("Gazebo",            1),
    ("Borsa frigo",       7),
    ("Ghiaccini",        20),
    ("Sedia da spiaggia", 6),
    ("Carte da gioco",    2),
    ("Crema solare",      2),
    ("Rete da beach",     1),
    ("Palla da beach",    2),
    ("Bocce spiaggia",    1),
]

SEED_USERS = [
    ("Bea",        "Ministro dei Rapporti con il Parlamento", "🏠"),
    ("Cassi",      "Ministro dei Beni Culturali",             "🎨"),
    ("Ila",        "Presidente del Consiglio dei Ministri",   "👑"),
    ("Marta",      "Ministro degli Esteri",                   "✈️"),
    ("Pril",       "Ministro delle Infrastrutture",           "🧱"),
    ("Bak",        "Ministro della Difesa",                   "🛡️"),
    ("Pippo",      "Ministro dell'Istruzione",                "🧑‍🎓"),
    ("Ciccio",     "Ministro delle Pari Opportunità",         "👴🏾"),
    ("Pisi",       "Ministro della Sovranità Alimentare",     "🌾"),
    ("Ciolo",      "Ministro della Giustizia",                "⚖️"),
    ("Varru",      "Ministro dell'Innovazione",               "🖥️"),
    ("Giolli",     "Ministro dell'Energia",                   "🔋"),
    ("Anna Colli", "Ministro dell'Interno",                   "🚓"),
    ("Ziba",       "Ministro dello Sport",                    "⚽"),
]

def seed():
    db = SessionLocal()
    try:
        for name, target in SEED_ITEMS:
            item = db.query(Item).filter_by(name=name).first()
            if not item:
                db.add(Item(name=name, target=target))
            else:
                item.target = target
        db.commit()

        for name, desc, icon in SEED_USERS:
            user = db.query(User).filter(User.name.ilike(name)).first()
            if not user:
                db.add(User(name=name, desc=desc, icon=icon))
            else:
                user.desc = desc
                user.icon = icon
        db.commit()

    finally:
        db.close()


@app.on_event("startup")
def startup():
    seed()