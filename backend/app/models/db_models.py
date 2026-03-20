"""
User & party room DB models.
"""

import datetime as _dt
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Float, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)

    # Game stats
    games_played = Column(Integer, default=0)
    best_return_pct = Column(Float, default=0.0)
    daily_streak = Column(Integer, default=0)

    # Relationships
    room_memberships = relationship("RoomPlayer", back_populates="user")


class PartyRoomDB(Base):
    __tablename__ = "party_rooms"

    room_code = Column(String(6), primary_key=True)
    room_name = Column(String, nullable=False)
    archetype = Column(String, nullable=False)
    timing = Column(String, nullable=False, default="standard")
    host_id = Column(String, ForeignKey("users.id"), nullable=False)
    started = Column(Boolean, default=False)
    current_round = Column(Integer, default=0)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)

    players = relationship("RoomPlayer", back_populates="room", cascade="all, delete-orphan")


class RoomPlayer(Base):
    __tablename__ = "room_players"

    id = Column(Integer, primary_key=True, autoincrement=True)
    room_code = Column(String(6), ForeignKey("party_rooms.room_code"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    user_name = Column(String, nullable=False)
    is_host = Column(Boolean, default=False)
    portfolio_value = Column(Float, default=100_000.0)
    total_return_pct = Column(Float, default=0.0)
    current_round = Column(Integer, default=0)
    last_action = Column(String, default="")
    # Store allocation as JSON string
    allocation_json = Column(Text, default="{}")

    room = relationship("PartyRoomDB", back_populates="players")
    user = relationship("User", back_populates="room_memberships")
