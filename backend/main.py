from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import engine, SessionLocal
from models import Base, User, Item, Contribution

app = FastAPI()

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
                "name": item.name,
                "target": item.target,
                "total": total,
                "users": users
            })

        return result

    finally:
        db.close()


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

    return {
        "ok": True,
        "target": item.target
    }


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


@app.get("/health")
def health():
    return {"status": "ok"}


# =========================
# SEED
# =========================

SEED_ITEMS = [
    ("Ombrellone", 3),
    ("Gazebo", 1),
    ("Borsa frigo", 2),
    ("Ghiaccini", 4),
    ("Sedia da spiaggia", 7),
    ("Carte da gioco", 1),
    ("Crema solare", 4),
    ("Rete da beach", 1),
    ("Palla da beach", 1),
    ("Bocce", 1),
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
    finally:
        db.close()


@app.on_event("startup")
def startup():
    seed()