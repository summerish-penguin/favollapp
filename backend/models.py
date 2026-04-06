from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, index=True)
    desc = Column(String, nullable=True)
    icon = Column(String, nullable=True)

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    category = Column(String, nullable=True)
    target = Column(Integer, nullable=False, default=1)   # quante unità totali si vogliono portare

class Contribution(Base):
    __tablename__ = "contributions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    quantity = Column(Integer, default=1)

class ShoppingItem(Base):
    __tablename__ = "shopping_items"
    id         = Column(Integer, primary_key=True)
    day        = Column(String, nullable=True)
    ingredient = Column(String, nullable=False)
    qty        = Column(String, nullable=True)
    
class Location(Base):
    __tablename__ = "locations"
    id           = Column(Integer, primary_key=True)
    LocationName = Column(String)
    Lat          = Column(Float)
    Lng          = Column(Float)
    LocCategory  = Column(String)
    MinsAway     = Column(Integer, nullable=True)