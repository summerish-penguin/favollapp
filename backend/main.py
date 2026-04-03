from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from db import engine, SessionLocal
from models import Base, User, Item, Contribution

app = FastAPI()

# CORS
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

def get_or_create_user(db: Session, name: str):
    user = db.query(User).filter_by(name=name).first()
    if not user:
        user = User(name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_or_create_item(db: Session, name: str):
    item = db.query(Item).filter_by(name=name).first()
    if not item:
        item = Item(name=name)
        db.add(item)
        db.commit()
        db.refresh(item)
    return item

def warehouse_state(db: Session):
    """Ritorna lo stato corrente del magazzino"""
    items = db.query(Item).all()
    result = []

    for item in items:
        contributions = db.query(Contribution).filter_by(item_id=item.id).all()
        users = []
        total = 0

        for c in contributions:
            user = db.get(User, c.user_id)
            if user:
                users.append({"name": user.name, "qty": c.quantity})
                total += c.quantity

        result.append({"name": item.name, "total": total, "users": users})

    return result


# =========================
# ENDPOINTS
# =========================

@app.get("/warehouse")
def get_warehouse():
    db = SessionLocal()
    try:
        return warehouse_state(db)
    finally:
        db.close()


@app.post("/warehouse/update")
def update(req: UpdateRequest):
    db = SessionLocal()
    try:
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
            if req.delta > 0:
                contrib = Contribution(
                    user_id=user.id,
                    item_id=item.id,
                    quantity=req.delta
                )
                db.add(contrib)

        db.commit()
        # restituisci subito lo stato aggiornato
        return warehouse_state(db)
    except SQLAlchemyError:
        db.rollback()
        return {"ok": False, "error": "Database error"}
    finally:
        db.close()


@app.post("/warehouse/remove")
def remove(req: RemoveRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(name=req.user).first()
        item = db.query(Item).filter_by(name=req.item).first()

        if user and item:
            contrib = db.query(Contribution).filter_by(
                user_id=user.id,
                item_id=item.id
            ).first()
            if contrib:
                db.delete(contrib)
                db.commit()

        # restituisci subito lo stato aggiornato
        return warehouse_state(db)
    finally:
        db.close()


# =========================
# SEED
# =========================

def seed():
    db = SessionLocal()
    try:
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
    finally:
        db.close()

seed()