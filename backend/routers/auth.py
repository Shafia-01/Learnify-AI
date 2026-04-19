"""
Learnify AI — Authentication Router.

Handles user registration, login, logout, profile management, and token refresh.
"""

import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth_utils import (
    create_access_token,
    decode_access_token,
    get_current_user,
    hash_password,
    oauth2_scheme,
    verify_password,
)
from database import get_db
from models.schemas import (
    AuthResponse,
    AuthUserResponse,
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    UsernameCheckResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Regex for basic email format validation
EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Register a new user account.
    
    Validates email format, password strength, and uniqueness of username/email.
    Mirrors the user into both 'registered_users' and 'users' collections.
    """
    # 1. Validate email format
    if not re.match(EMAIL_REGEX, payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )

    # 2. Validate password strength (at least 8 chars, 1 uppercase, 1 digit)
    password = payload.password
    if not any(c.isupper() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter and one digit"
        )

    # 3. Check for existing user
    existing_user = await db["registered_users"].find_one({
        "$or": [
            {"email": payload.email.lower()},
            {"username": payload.username}
        ]
    })
    if existing_user:
        if existing_user["email"] == payload.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken"
        )

    # 4. Create internal user document
    now = datetime.utcnow()
    user_id = uuid.uuid4().hex
    
    user_doc = {
        "user_id": user_id,
        "username": payload.username,
        "email": payload.email.lower(),
        "hashed_password": hash_password(payload.password),
        "name": payload.name,
        "level": payload.level,
        "language": payload.language,
        "avatar_emoji": "🎓",
        "xp": 0,
        "badges": [],
        "streak_days": 0,
        "created_at": now,
        "last_active_date": now,
        "is_active": True,
    }
    await db["registered_users"].insert_one(user_doc)

    # 5. Mirror to legacy 'users' collection for compatibility
    user_profile = {
        "user_id": user_id,
        "name": payload.name,
        "level": payload.level,
        "language": payload.language,
        "xp": 0,
        "badges": [],
        "streak_days": 0,
        "quiz_scores": {},
        "last_active_date": now,
    }
    await db["users"].insert_one(user_profile)

    # 6. Issue access token
    token = create_access_token(data={"sub": user_id})
    return AuthResponse(
        access_token=token,
        user=AuthUserResponse(**user_doc)
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Authenticate user and return a JWT access token.
    Accepts either email or username in the identifier field.
    """
    # Detect identifier type
    query = {}
    if "@" in payload.identifier:
        query = {"email": payload.identifier.lower()}
    else:
        query = {"username": payload.identifier}

    user = await db["registered_users"].find_one(query)
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Update activity timestamps
    now = datetime.utcnow()
    await db["registered_users"].update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_active_date": now}}
    )
    await db["users"].update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_active_date": now}}
    )

    token = create_access_token(data={"sub": user["user_id"]})
    return AuthResponse(
        access_token=token,
        user=AuthUserResponse(**user)
    )


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Revoke the current access token by adding it to the 'revoked_tokens' collection.
    """
    payload = decode_access_token(token)
    exp = payload.get("exp")
    
    # Convert token expiry timestamp to datetime for MongoDB TTL index
    expires_at = datetime.utcfromtimestamp(exp)
    
    await db["revoked_tokens"].insert_one({
        "token": token,
        "expires_at": expires_at
    })
    
    return {"message": "Token successfully revoked"}


@router.get("/me", response_model=AuthUserResponse)
async def get_me(current_user: AuthUserResponse = Depends(get_current_user)):
    """
    Return the profile of the currently authenticated user.
    """
    return current_user


@router.put("/profile", response_model=AuthUserResponse)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: AuthUserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update profile details for the authenticated user.
    Only updates provided fields.
    """
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field must be provided for update"
        )

    # 1. Update in the primary registration collection
    await db["registered_users"].update_one(
        {"user_id": current_user.user_id},
        {"$set": update_data}
    )

    # 2. Update in the legacy users collection
    await db["users"].update_one(
        {"user_id": current_user.user_id},
        {"$set": update_data}
    )

    # Fetch and return updated profile
    updated_user = await db["registered_users"].find_one({"user_id": current_user.user_id})
    return AuthUserResponse(**updated_user)


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    token: str = Depends(oauth2_scheme),
    current_user: AuthUserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Revoke current token and issue a fresh one with a new expiry.
    """
    # Revoke old token
    payload = decode_access_token(token)
    exp = payload.get("exp")
    expires_at = datetime.utcfromtimestamp(exp)
    
    await db["revoked_tokens"].insert_one({
        "token": token,
        "expires_at": expires_at
    })

    # Issue new token
    new_token = create_access_token(data={"sub": current_user.user_id})
    
    return AuthResponse(
        access_token=new_token,
        user=current_user
    )


@router.get("/check-username", response_model=UsernameCheckResponse)
async def check_username(username: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Verify if a username meets format requirements and is available.
    """
    # 1. Validate format
    if not (3 <= len(username) <= 20):
        return UsernameCheckResponse(
            username=username,
            available=False,
            message="Username must be between 3 and 20 characters."
        )
    
    if not re.match(r"^[a-zA-Z0-9_]+$", username):
        return UsernameCheckResponse(
            username=username,
            available=False,
            message="Username can only contain alphanumeric characters and underscores."
        )

    # 2. Check DB
    existing = await db["registered_users"].find_one({"username": username})
    if existing:
        return UsernameCheckResponse(
            username=username,
            available=False,
            message="Username is already taken."
        )
    
    return UsernameCheckResponse(
        username=username,
        available=True,
        message="Username is available."
    )
