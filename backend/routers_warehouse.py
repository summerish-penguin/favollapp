# routers_warehouse.py — endpoint /warehouse, /warehouse/update, /warehouse/remove, /items

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from db import get_db
from models import Item, User, Contribution
from schemas import UpdateRequest, RemoveRequest, CreateItemRequest, UpdateItemRequest
from helpers import get_or_create_user, get_or_create_item

router = APIRouter()


@router.api_route("/warehouse", methods=["GET", "HEAD"])
def get_warehouse(request: Request, db: Session = Depends(get_db)):
    """Restituisce tutti gli item con i relativi contributi e target."""
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
            "name":   item.name,
            "target": item.target,
            "total":  total,
            "users":  users
        })

    return result


@router.post("/warehouse/update")
def update(data: UpdateRequest, db: Session = Depends(get_db)):
    """Aggiorna la quantità di un contributo (delta positivo o negativo)."""
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


@router.post("/warehouse/remove")
def remove(req: RemoveRequest, db: Session = Depends(get_db)):
    """Rimuove completamente il contributo di un utente per un item."""
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


@router.post("/items")
def create_item(req: CreateItemRequest, db: Session = Depends(get_db)):
    """Crea un nuovo item. Restituisce 409 se il nome esiste già."""
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


@router.put("/items/{old_name}")
def update_item(old_name: str, req: UpdateItemRequest, db: Session = Depends(get_db)):
    """Modifica nome e/o target di un item esistente."""
    item = db.query(Item).filter_by(name=old_name).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item non trovato.")
    if req.target < 1:
        raise HTTPException(status_code=422, detail="Il target deve essere almeno 1.")
    if req.name != old_name:
        if db.query(Item).filter_by(name=req.name).first():
            raise HTTPException(status_code=409, detail="Nome già esistente.")

    item.name   = req.name
    item.target = req.target
    db.commit()
    return {"ok": True, "name": item.name, "target": item.target}


@router.delete("/items/{name}")
def delete_item(name: str, db: Session = Depends(get_db)):
    """Elimina un item e tutti i suoi contributi."""
    item = db.query(Item).filter_by(name=name).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item non trovato.")

    db.query(Contribution).filter_by(item_id=item.id).delete()
    db.delete(item)
    db.commit()
    return {"ok": True}
