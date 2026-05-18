from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Header, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("/")
async def get_documents(
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_id: str = Header(default="anonymous", alias="user_id"),
):
    """
    Fetch all uploaded documents for the user, grouped by subject.
    """
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": {"subject": "$subject", "source_file": "$source_file"}
        }}
    ]
    cursor = db["chunks"].aggregate(pipeline)
    results = await cursor.to_list(length=None)
    
    # Structure: { subject_name: [file1, file2] }
    library = {}
    for doc in results:
        sub = doc["_id"].get("subject") or "Uncategorized"
        filename = doc["_id"].get("source_file") or "Unknown"
        
        if sub not in library:
            library[sub] = []
        if filename not in library[sub]:
            library[sub].append(filename)
            
    # Convert to a list format for frontend
    # [ { "subject": "Math", "documents": ["doc1.pdf", "doc2.pdf"] } ]
    response = [{"subject": k, "documents": v} for k, v in library.items()]
    return response

@router.delete("/")
async def delete_documents(
    subject: str = Query(...),
    filename: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_id: str = Header(default="anonymous", alias="user_id"),
):
    """
    Delete chunks for a specific subject, and optionally a specific document within it.
    """
    query = {"user_id": user_id}
    
    if subject != "Uncategorized":
        query["subject"] = subject
    else:
        query["subject"] = {"$in": [None, ""]}
        
    if filename:
        query["source_file"] = filename
        
    result = await db["chunks"].delete_many(query)
    
    # We do not delete from FAISS currently as it's complex to delete by metadata in base FAISS,
    # but the game/quiz generator samples from MongoDB directly so it will no longer use these chunks.
    # The RAG pipeline might still retrieve them if queried via vector similarity, but games/quizzes are fixed.
    
    return {"message": "deleted", "deleted_count": result.deleted_count}
