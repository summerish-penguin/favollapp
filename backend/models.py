from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

# Persona del gruppo (nome, descrizione, icona)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, index=True)
    desc = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    # Hash della password: nullo finché la personH non viene "rivendicata" al primo accesso
    password_hash = Column(String, nullable=True)

# Oggetto condiviso da portare in vacanza, con quantità target
class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    category = Column(String, nullable=True)
    target = Column(Integer, nullable=False, default=1)   # quante unità totali si vogliono portare

# Quantità di un item che un utente si è impegnato a portare
class Contribution(Base):
    __tablename__ = "contributions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    quantity = Column(Integer, default=1)

# Riga della lista della spesa
class ShoppingItem(Base):
    __tablename__ = "shopping_items"
    id         = Column(Integer, primary_key=True)
    day        = Column(String, nullable=True)
    ingredient = Column(String, nullable=False)
    qty        = Column(String, nullable=True)

# Punto di interesse mostrato sulla mappa (casa, spiagge, servizi...)
class Location(Base):
    __tablename__ = "locations"
    id         = Column(Integer, primary_key=True)
    name       = Column(String)
    lat        = Column(Float)
    lng        = Column(Float)
    category   = Column(String)
    mins_away  = Column(Integer, nullable=True)

# Log tecnico delle richieste HTTP (ip, user-agent, path, metodo) per monitoring
class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ip = Column(String)
    user_agent = Column(String)
    path = Column(String)
    method = Column(String)
