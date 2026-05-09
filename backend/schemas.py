# =============================================================================
# SCHEMAS.PY — Pydantic models per validazione request/response
# =============================================================================

from pydantic import BaseModel


# ── Warehouse ────────────────────────────────────────────────────────────────

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

class UpdateItemRequest(BaseModel):
    name: str
    target: int


# ── AI ────────────────────────────────────────────────────────────────────────

class RecipeRequest(BaseModel):
    prompt: str


# ── Shopping ──────────────────────────────────────────────────────────────────

class ShoppingItemRequest(BaseModel):
    day:        str = ""
    ingredient: str
    qty:        str = ""

class ShoppingItemUpdate(BaseModel):
    day:        str = ""
    ingredient: str = ""
    qty:        str = ""
