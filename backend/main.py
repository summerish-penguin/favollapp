from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import engine, SessionLocal
from models import Base, User, Item, Contribution

app = FastAPI()

# CORS (necessario per GitHub Pages)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


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


# =========================
# HELPERS
# =========================

def get_or_create_user(db, name):
    user = db.query(User).filter_by(name=name).first()
    if not user:
        user = User(name=name)
        db.add(user)
        db.commit()
    return user

def get_or_create_item(db, name):
    item = db.query(Item).filter_by(name=name).first()
    if not item:
        item = Item(name=name)
        db.add(item)
        db.commit()
    return item


# =========================
# ENDPOINTS
# =========================

@app.get("/warehouse")
def get_warehouse():
    db = SessionLocal()

    items = db.query(Item).all()
    result = []

    for item in items:
        contributions = db.query(Contribution).filter_by(item_id=item.id).all()

        users = []
        total = 0

        for c in contributions:
            user = db.query(User).get(c.user_id)
            users.append({
                "name": user.name,
                "qty": c.quantity
            })
            total += c.quantity

        result.append({
            "name": item.name,
            "total": total,
            "users": users
        })

    return result


@app.post("/warehouse/update")
def update(req: UpdateRequest):
    db = SessionLocal()

    user = get_or_create_user(db, req.user)
    item = get_or_create_item(db, req.item)

    contrib = db.query(Contribution).filter_by(
        user_id=user.id,
        item_id=item.id
    ).first()

    if contrib:
        contrib.quantity += req.delta

        if contrib.quantity <= 0:
            db.delete(contrib)
    else:
        contrib = Contribution(
            user_id=user.id,
            item_id=item.id,
            quantity=max(1, req.delta)
        )
        db.add(contrib)

    db.commit()
    return {"ok": True}


@app.post("/warehouse/remove")
def remove(req: RemoveRequest):
    db = SessionLocal()

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

def seed():
    db = SessionLocal()
    items = [
        "Ombrellone",
        "Borsa frigo",
        "Ghiaccini",
        "Sedia da spiaggia",
        "Carte da gioco",
        "Crema solare",
        "Rete da beach",
        "Palla da beach",
        "Bocce"
        ]

    for name in items:
        if not db.query(Item).filter_by(name=name).first():
            db.add(Item(name=name))

    db.commit()

seed()