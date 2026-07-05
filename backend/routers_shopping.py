# routers_shopping.py — endpoint /shopping (GET, POST, PUT, DELETE singolo, DELETE bulk)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import ShoppingItem
from schemas import ShoppingItemRequest, ShoppingItemUpdate

router = APIRouter()


@router.get("/shopping")
def get_shopping_items(db: Session = Depends(get_db)):
    """Restituisce tutta la lista della spesa ordinata per id."""
    items = db.query(ShoppingItem).order_by(ShoppingItem.id).all()
    return [
        {"id": item.id, "day": item.day, "ingredient": item.ingredient, "qty": item.qty}
        for item in items
    ]


@router.post("/shopping")
def save_shopping_item(req: ShoppingItemRequest, db: Session = Depends(get_db)):
    """Aggiunge una riga alla lista della spesa."""
    if not req.ingredient.strip():
        raise HTTPException(status_code=422, detail="Ingrediente obbligatorio.")

    item = ShoppingItem(day=req.day, ingredient=req.ingredient, qty=req.qty)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"ok": True, "id": item.id}


@router.put("/shopping/{id}")
def update_shopping_item(id: int, req: ShoppingItemUpdate, db: Session = Depends(get_db)):
    """Aggiorna una riga esistente della lista della spesa."""
    item = db.query(ShoppingItem).filter_by(id=id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item non trovato.")

    item.day        = req.day
    item.ingredient = req.ingredient
    item.qty        = req.qty
    db.commit()
    return {"ok": True}


@router.delete("/shopping/{id}")
def delete_shopping_item(id: int, db: Session = Depends(get_db)):
    """Elimina una singola riga dalla lista della spesa."""
    item = db.query(ShoppingItem).filter_by(id=id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item non trovato.")

    db.delete(item)
    db.commit()
    return {"ok": True}


@router.delete("/shopping")
def clear_shopping(db: Session = Depends(get_db)):
    """Svuota l'intera lista della spesa."""
    db.query(ShoppingItem).delete()
    db.commit()
    return {"ok": True}
