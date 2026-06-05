import asyncio
import sys
import os
from datetime import datetime

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from database import init_db, close_db, get_db
from auth_utils import create_access_token
from models.schemas import AuthUserResponse

async def main():
    print("Initializing Database...")
    await init_db()
    
    # Get database instance
    db_gen = get_db()
    db = await anext(db_gen)
    
    test_user_id = "test_del_user_123"
    test_email = "test_del@example.com"
    test_username = "test_del_user"
    
    # Clean up test user and document chunks if any exist
    await db["registered_users"].delete_many({"user_id": test_user_id})
    await db["chunks"].delete_many({"user_id": test_user_id})
    
    # Register the test user in database directly
    # (So they have a record in registered_users)
    user_doc = {
        "user_id": test_user_id,
        "username": test_username,
        "email": test_email,
        "password_hash": "dummy_hash",
        "name": "Delete Test User",
        "level": "beginner",
        "language": "en",
        "xp": 0,
        "badges": [],
        "streak_days": 0,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    await db["registered_users"].insert_one(user_doc)
    print(f"Created test user in database: {test_user_id}")
    
    # Insert some dummy chunks for this user
    chunk_doc = {
        "user_id": test_user_id,
        "chunk_id": "chunk_dummy_001",
        "subject": "Math",
        "source_file": "algebra.pdf",
        "text": "x + y = z"
    }
    await db["chunks"].insert_one(chunk_doc)
    print("Inserted dummy chunk for test user")
    
    # Create valid JWT token for this user
    token = create_access_token(data={"sub": test_user_id})
    print(f"Generated token: {token[:15]}...")
    
    # Initialize TestClient within app lifespan context
    # Note: TestClient in FastAPI runs synchronously, so we must run inside a thread or use it sync.
    # Since lifespan is async, TestClient handles entering lifespan context. We'll use a sync context.
    with TestClient(app) as client:
        # 1. Test deleting without Authorization header
        print("Testing DELETE /api/documents without Authorization header...")
        response = client.delete("/api/documents?subject=Math&filename=algebra.pdf")
        print(f"Response status: {response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Unauthenticated request was blocked.")
        
        # 2. Test deleting with spoofed user_id Header (no Bearer token)
        print("Testing DELETE /api/documents with spoofed user_id header but no token...")
        response = client.delete(
            "/api/documents?subject=Math&filename=algebra.pdf",
            headers={"user_id": test_user_id}
        )
        print(f"Response status: {response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Spoofed user_id header request was blocked.")
        
        # 3. Test deleting with valid Authorization Bearer token
        print("Testing DELETE /api/documents with valid token...")
        response = client.delete(
            "/api/documents?subject=Math&filename=algebra.pdf",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Response status: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.json()["deleted_count"] == 1
        print("PASS: Authenticated deletion succeeded.")
        
        # 4. Verify that the chunk is indeed deleted in DB
        db_chunk = await db["chunks"].find_one({"user_id": test_user_id})
        assert db_chunk is None, "Chunk was not deleted from database!"
        print("PASS: Verified chunk deletion in Database.")
        
        # 5. Verify GET /api/documents still works without JWT (using header user_id)
        # First re-insert a chunk
        await db["chunks"].insert_one(chunk_doc)
        print("Re-inserted dummy chunk for GET test.")
        
        print("Testing GET /api/documents with user_id header (no token)...")
        response = client.get(
            "/api/documents",
            headers={"user_id": test_user_id}
        )
        print(f"Response status: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert len(response.json()) > 0
        print("PASS: GET /api/documents works with user_id header.")
        
    # Cleanup
    await db["registered_users"].delete_many({"user_id": test_user_id})
    await db["chunks"].delete_many({"user_id": test_user_id})
    print("Database cleanup completed.")
    await close_db()
    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
