import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from motor.motor_asyncio import AsyncIOMotorClient
from database import init_db, close_db, get_db
from routers.auth import register, login, reset_password
from models.schemas import RegisterRequest, LoginRequest, ResetPasswordRequest
from config import settings

async def main():
    print("Initializing Database...")
    await init_db()
    
    # Get database instance
    db_gen = get_db()
    db = await anext(db_gen)
    
    # Clean up test user if exists
    test_email = "test_reset@example.com"
    test_username = "test_reset_user"
    await db["registered_users"].delete_many({"email": test_email})
    await db["users"].delete_many({"name": "Reset Test User"})
    
    print("Testing Registration...")
    reg_payload = RegisterRequest(
        username=test_username,
        email=test_email,
        password="Password123",
        name="Reset Test User",
        level="intermediate",
        language="en"
    )
    
    reg_res = await register(reg_payload, db)
    print(f"Registration Successful! User ID: {reg_res.user.user_id}")
    
    print("Testing Reset Password with invalid email...")
    try:
        invalid_reset_payload = ResetPasswordRequest(
            email="nonexistent@example.com",
            new_password="NewPassword123"
        )
        await reset_password(invalid_reset_payload, db)
        print("FAIL: Reset password should have failed for nonexistent email")
    except Exception as e:
        print(f"PASS: Reset password failed as expected: {e}")
        
    print("Testing Reset Password with weak password...")
    try:
        weak_reset_payload = ResetPasswordRequest(
            email=test_email,
            new_password="weak"
        )
        await reset_password(weak_reset_payload, db)
        print("FAIL: Reset password should have failed for weak password")
    except Exception as e:
        print(f"PASS: Reset password failed as expected: {e}")
        
    print("Testing Reset Password with valid new password...")
    valid_reset_payload = ResetPasswordRequest(
        email=test_email,
        new_password="NewPassword123"
    )
    reset_res = await reset_password(valid_reset_payload, db)
    print(f"PASS: Reset password message: {reset_res}")
    
    print("Testing Login with old password...")
    try:
        old_login_payload = LoginRequest(
            identifier=test_email,
            password="Password123"
        )
        await login(old_login_payload, db)
        print("FAIL: Login with old password should have failed")
    except Exception as e:
        print(f"PASS: Login failed as expected: {e}")
        
    print("Testing Login with new password...")
    new_login_payload = LoginRequest(
        identifier=test_email,
        password="NewPassword123"
    )
    login_res = await login(new_login_payload, db)
    print(f"PASS: Login succeeded! Access token generated: {login_res.access_token is not None}")
    
    # Cleanup
    await db["registered_users"].delete_many({"email": test_email})
    await db["users"].delete_many({"name": "Reset Test User"})
    print("Cleanup completed.")
    await close_db()

if __name__ == "__main__":
    asyncio.run(main())
