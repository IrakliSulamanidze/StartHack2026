"""
JWT + password hashing utilities.
"""

import os
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError

# Secret key — in production, use a real secret from env
SECRET_KEY = os.getenv("JWT_SECRET", "lps-hackathon-secret-2026-starthack")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72  # generous for hackathon demo


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, name: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "name": name,
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Returns payload dict or None if invalid/expired."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
