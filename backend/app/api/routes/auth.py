"""
Auth routes — signup, login, me.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.models.db_models import User

router = APIRouter()
security = HTTPBearer()


# ── Request/Response models ──

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    games_played: int
    best_return_pct: float
    daily_streak: int


# ── Dependency: get current user from JWT ──

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(creds.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Routes ──

@router.post("/signup", response_model=AuthResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if not req.name or not req.email or not req.password:
        raise HTTPException(status_code=400, detail="All fields required")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password too short")

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.name, user.email)
    return AuthResponse(
        token=token,
        user={"id": user.id, "name": user.name, "email": user.email},
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id, user.name, user.email)
    return AuthResponse(
        token=token,
        user={"id": user.id, "name": user.name, "email": user.email},
    )


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        games_played=user.games_played,
        best_return_pct=user.best_return_pct,
        daily_streak=user.daily_streak,
    )


@router.put("/me")
def update_me(
    updates: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "name" in updates:
        user.name = updates["name"]
    if "email" in updates:
        user.email = updates["email"]
    if "games_played" in updates:
        user.games_played = updates["games_played"]
    if "best_return_pct" in updates:
        user.best_return_pct = updates["best_return_pct"]
    if "daily_streak" in updates:
        user.daily_streak = updates["daily_streak"]
    db.commit()
    return {"status": "updated"}
