"""
Learnify AI — Authentication Utilities.

Provides JWT generation, decoding, password hashing, and FastAPI dependencies
for user authentication and authorization.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import settings
from database import get_db
from models.schemas import AuthUserResponse

# ── Password Hashing ─────────────────────────────────────────────────────
# Using bcrypt for secure one-way password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a hashed version.
    """
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT Handling ─────────────────────────────────────────────────────────
# OAuth2 scheme for token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a signed JWT for a user.
    
    Args:
        data: Dictionary of claims to include in the token payload.
        expires_delta: Optional override for token lifespan.
        
    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.JWT_EXPIRE_DAYS)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decodes and validates a JWT.
    
    Args:
        token: The Bearer token string.
        
    Returns:
        The decoded claims dictionary.
        
    Raises:
        HTTP 401: If token is invalid, expired, or malformed.
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── FastAPI Dependencies ─────────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db)
) -> AuthUserResponse:
    """
    FastAPI dependency to extract the current user from a Bearer token.
    
    Performs the following checks:
    1. Decodes and validates JWT authenticity and expiry.
    2. Checks 'revoked_tokens' collection to identify logged-out sessions.
    3. Fetches user data from 'registered_users'.
    4. Verifies account 'is_active' status.
    
    Args:
        token: Extracted from Authorization header.
        db: MongoDB database handle.
        
    Returns:
        AuthUserResponse: The validated user profile.
    """
    payload = decode_access_token(token)
    user_id: str = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject",
        )

    # Check if token is revoked (stored in DB upon logout)
    revoked = await db["revoked_tokens"].find_one({"token": token})
    if revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
        )

    # Fetch user from registration collection
    user_doc = await db["registered_users"].find_one({"user_id": user_id})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token does not exist.",
        )

    # Verify account is active
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    return AuthUserResponse(**user_doc)
