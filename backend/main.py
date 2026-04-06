from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import requests

from db import engine, SessionLocal
from models import Base, User, Item, Contribution, ShoppingItem

app = FastAPI()

load_dotenv()

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    day: str = ""
    ingredient: str
    qty: str = ""

class ShoppingItemUpdate(BaseModel):
    day: str = ""
    ingredient: str = ""
    qty: str = ""

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
def get_warehouse(request: Request, db: Session = Depends(get_db)):
    if request.method == "HEAD":
        return

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
            "name": item.name,
            "target": item.target,
            "total": total,
            "users": users
        })

    return result


@app.post("/warehouse/update")
def update(data: UpdateRequest, db: Session = Depends(get_db)):
    item = get_or_create_item(db, data.item)
    user = get_or_create_user(db, data.user)

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
def remove(req: RemoveRequest, db: Session = Depends(get_db)):
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


@app.delete("/items/{name}")
def delete_item(name: str, db: Session = Depends(get_db)):
    item = db.query(Item).filter_by(name=name).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item non trovato.")

    db.query(Contribution).filter_by(item_id=item.id).delete()
    db.delete(item)
    db.commit()

    return {"ok": True}

from models import Base, User, Item, Contribution, ShoppingItem, Location

@app.get("/locations")
def get_locations(db: Session = Depends(get_db)):
    locs = db.query(Location).all()
    return [
        {
            "LocationName": l.LocationName,
            "Lat":          l.Lat,
            "Lng":          l.Lng,
            "LocCategory":  l.LocCategory,
            "MinsAway":     l.MinsAway
        }
        for l in locs
    ]

@app.get("/health")
def health():
    return {"status": "ok"}

# =========================
# SEED (invariato ma safe)
# =========================

def seed(db: Session):
    items = db.query(Item).count()
    if items > 0:
        return  # evita duplicazioni

    SEED_ITEMS = [
        ("Ombrellone", 6),
        ("Gazebo", 1),
        ("Borsa frigo", 7),
    ]

    for name, target in SEED_ITEMS:
        db.add(Item(name=name, target=target))

    db.commit()

@app.on_event("startup")
def startup():
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()