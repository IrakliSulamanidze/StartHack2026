"""
Party routes — REST for room CRUD + WebSocket for real-time sync.
"""

import json
import random
import string
import asyncio
from typing import Dict, Set
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.db_models import PartyRoomDB, RoomPlayer, User
from app.api.routes.auth import get_current_user

router = APIRouter()


# ── WebSocket connection manager ──

class ConnectionManager:
    """Manages WebSocket connections per room."""

    def __init__(self):
        self.rooms: Dict[str, Dict[str, WebSocket]] = defaultdict(dict)  # room_code -> {user_id: ws}

    async def connect(self, room_code: str, user_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms[room_code][user_id] = ws

    def disconnect(self, room_code: str, user_id: str):
        self.rooms[room_code].pop(user_id, None)
        if not self.rooms[room_code]:
            del self.rooms[room_code]

    async def broadcast(self, room_code: str, message: dict):
        """Send to all connected clients in a room."""
        conns = list(self.rooms.get(room_code, {}).items())
        for uid, ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                self.rooms[room_code].pop(uid, None)

    async def send_to(self, room_code: str, user_id: str, message: dict):
        ws = self.rooms.get(room_code, {}).get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


# ── REST models ──

class CreateRoomRequest(BaseModel):
    room_name: str
    archetype: str
    timing: str = "standard"


class RoomResponse(BaseModel):
    room_code: str
    room_name: str
    archetype: str
    timing: str
    host_id: str
    started: bool
    current_round: int
    players: list


def _generate_room_code() -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(chars) for _ in range(6))


def _room_to_response(room: PartyRoomDB) -> RoomResponse:
    return RoomResponse(
        room_code=room.room_code,
        room_name=room.room_name,
        archetype=room.archetype,
        timing=room.timing,
        host_id=room.host_id,
        started=room.started,
        current_round=room.current_round,
        players=[
            {
                "id": p.user_id,
                "name": p.user_name,
                "isHost": p.is_host,
                "portfolioValue": p.portfolio_value,
                "totalReturnPct": p.total_return_pct,
                "currentRound": p.current_round,
            }
            for p in room.players
        ],
    )


# ── REST endpoints ──

@router.post("/create", response_model=RoomResponse)
def create_room(req: CreateRoomRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    code = _generate_room_code()
    # Ensure unique
    while db.query(PartyRoomDB).filter(PartyRoomDB.room_code == code).first():
        code = _generate_room_code()

    room = PartyRoomDB(
        room_code=code,
        room_name=req.room_name,
        archetype=req.archetype,
        timing=req.timing,
        host_id=user.id,
    )
    db.add(room)
    db.flush()

    player = RoomPlayer(
        room_code=code,
        user_id=user.id,
        user_name=user.name,
        is_host=True,
    )
    db.add(player)
    db.commit()
    db.refresh(room)

    return _room_to_response(room)


@router.post("/join/{room_code}", response_model=RoomResponse)
def join_room(room_code: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(PartyRoomDB).filter(PartyRoomDB.room_code == room_code.upper()).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.started:
        raise HTTPException(status_code=400, detail="Game already started")

    # Check if already in room
    existing = db.query(RoomPlayer).filter(
        RoomPlayer.room_code == room.room_code,
        RoomPlayer.user_id == user.id,
    ).first()
    if existing:
        return _room_to_response(room)

    player = RoomPlayer(
        room_code=room.room_code,
        user_id=user.id,
        user_name=user.name,
        is_host=False,
    )
    db.add(player)
    db.commit()
    db.refresh(room)

    return _room_to_response(room)


@router.get("/{room_code}", response_model=RoomResponse)
def get_room(room_code: str, db: Session = Depends(get_db)):
    room = db.query(PartyRoomDB).filter(PartyRoomDB.room_code == room_code.upper()).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return _room_to_response(room)


@router.post("/{room_code}/start")
def start_game(room_code: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(PartyRoomDB).filter(PartyRoomDB.room_code == room_code.upper()).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.host_id != user.id:
        raise HTTPException(status_code=403, detail="Only host can start")
    room.started = True
    room.current_round = 1
    db.commit()
    return {"status": "started"}


# ── Rankings ──

@router.get("/{room_code}/rankings")
def get_rankings(room_code: str, db: Session = Depends(get_db)):
    room = db.query(PartyRoomDB).filter(PartyRoomDB.room_code == room_code.upper()).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    players = sorted(room.players, key=lambda p: p.total_return_pct, reverse=True)
    return [
        {
            "rank": i + 1,
            "userId": p.user_id,
            "name": p.user_name,
            "portfolioValue": p.portfolio_value,
            "totalReturnPct": p.total_return_pct,
            "currentRound": p.current_round,
        }
        for i, p in enumerate(players)
    ]


# ── WebSocket endpoint: real-time room sync ──

@router.websocket("/ws/{room_code}")
async def party_ws(ws: WebSocket, room_code: str):
    """
    WebSocket protocol:
    Client sends:
      { "type": "auth", "token": "..." }                — first message, authenticates
      { "type": "round_complete", "round": 3, "portfolioValue": 102500, "returnPct": 2.5, "action": "custom" }
      { "type": "request_rankings" }
    
    Server sends:
      { "type": "room_update", "room": {...} }           — full room state
      { "type": "player_joined", "player": {...} }
      { "type": "game_started" }
      { "type": "rankings", "rankings": [...] }          — no scores, just rank + name + movement
      { "type": "player_round_complete", "userId": ..., "round": ... }
      { "type": "error", "message": "..." }
    """
    # First message must be auth
    try:
        await ws.accept()
        raw = await asyncio.wait_for(ws.receive_json(), timeout=10)
    except Exception:
        await ws.close(code=4001, reason="Auth timeout")
        return

    if raw.get("type") != "auth" or not raw.get("token"):
        await ws.send_json({"type": "error", "message": "First message must be auth"})
        await ws.close(code=4002, reason="Auth required")
        return

    payload = decode_token(raw["token"])
    if not payload:
        await ws.send_json({"type": "error", "message": "Invalid token"})
        await ws.close(code=4003, reason="Invalid token")
        return

    user_id = payload["sub"]
    user_name = payload.get("name", "Unknown")

    # Register connection
    manager.rooms[room_code.upper()][user_id] = ws

    db = next(get_db())
    try:
        room = db.query(PartyRoomDB).filter(PartyRoomDB.room_code == room_code.upper()).first()
        if not room:
            await ws.send_json({"type": "error", "message": "Room not found"})
            await ws.close()
            return

        # Send current room state
        await ws.send_json({"type": "room_update", "room": _room_to_response(room).model_dump()})

        # Notify others
        await manager.broadcast(room_code.upper(), {
            "type": "player_joined",
            "player": {"id": user_id, "name": user_name},
        })

        # Listen for messages
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "round_complete":
                # Player finished a round — update DB
                rp = db.query(RoomPlayer).filter(
                    RoomPlayer.room_code == room_code.upper(),
                    RoomPlayer.user_id == user_id,
                ).first()
                if rp:
                    rp.portfolio_value = data.get("portfolioValue", rp.portfolio_value)
                    rp.total_return_pct = data.get("returnPct", rp.total_return_pct)
                    rp.current_round = data.get("round", rp.current_round)
                    rp.last_action = data.get("action", "")
                    if data.get("allocation"):
                        rp.allocation_json = json.dumps(data["allocation"])
                    db.commit()

                # Broadcast that this player finished the round
                await manager.broadcast(room_code.upper(), {
                    "type": "player_round_complete",
                    "userId": user_id,
                    "name": user_name,
                    "round": data.get("round"),
                })

                # Auto-send rankings to everyone
                await _send_rankings(db, room_code.upper())

            elif msg_type == "request_rankings":
                await _send_rankings(db, room_code.upper())

            elif msg_type == "start_game":
                # Only host can start
                if user_id == room.host_id:
                    room.started = True
                    room.current_round = 1
                    db.commit()
                    await manager.broadcast(room_code.upper(), {"type": "game_started"})

            elif msg_type == "game_complete":
                # Player finished all rounds
                rp = db.query(RoomPlayer).filter(
                    RoomPlayer.room_code == room_code.upper(),
                    RoomPlayer.user_id == user_id,
                ).first()
                if rp:
                    rp.portfolio_value = data.get("portfolioValue", rp.portfolio_value)
                    rp.total_return_pct = data.get("returnPct", rp.total_return_pct)
                    rp.current_round = data.get("round", 10)
                    db.commit()

                await manager.broadcast(room_code.upper(), {
                    "type": "player_game_complete",
                    "userId": user_id,
                    "name": user_name,
                })
                await _send_rankings(db, room_code.upper())

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(room_code.upper(), user_id)
        db.close()
        # Notify room
        try:
            await manager.broadcast(room_code.upper(), {
                "type": "player_left",
                "userId": user_id,
                "name": user_name,
            })
        except Exception:
            pass


async def _send_rankings(db: Session, room_code: str):
    """Build and broadcast rankings — rank + name only, NO scores."""
    room = db.query(PartyRoomDB).filter(PartyRoomDB.room_code == room_code).first()
    if not room:
        return

    players = sorted(room.players, key=lambda p: p.total_return_pct, reverse=True)
    rankings = []
    for i, p in enumerate(players):
        rankings.append({
            "rank": i + 1,
            "userId": p.user_id,
            "name": p.user_name,
        })

    await manager.broadcast(room_code, {"type": "rankings", "rankings": rankings})
