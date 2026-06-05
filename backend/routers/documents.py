import re
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Header, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db
from auth_utils import get_current_user
from models.schemas import AuthUserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("")
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
        sub = doc["_id"].get("subject")
        sub = sub.strip().title() if sub else "Uncategorized"
        filename = doc["_id"].get("source_file") or "Unknown"
        
        if sub not in library:
            library[sub] = []
        if filename not in library[sub]:
            library[sub].append(filename)
            
    # Convert to a list format for frontend
    # [ { "subject": "Math", "documents": ["doc1.pdf", "doc2.pdf"] } ]
    response = [{"subject": k, "documents": v} for k, v in library.items()]
    return response

@router.delete("")
async def delete_documents(
    subject: str = Query(...),
    filename: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: AuthUserResponse = Depends(get_current_user),
):
    """
    Delete chunks for a specific subject, and optionally a specific document within it.
    """
    logger.info("Delete request received for user_id=%s, subject=%s, filename=%s", current_user.user_id, subject, filename)
    query = {"user_id": current_user.user_id}
    
    if subject != "Uncategorized":
        query["subject"] = {"$regex": f"^{re.escape(subject.strip())}$", "$options": "i"}
    else:
        query["subject"] = {"$in": [None, "", "Uncategorized"]}
        
    if filename:
        if filename != "Unknown":
            query["source_file"] = {"$regex": f"^{re.escape(filename.strip())}$", "$options": "i"}
        else:
            query["source_file"] = {"$in": [None, "", "Unknown"]}
        
    # Retrieve chunk_ids to remove from FAISS index
    cursor = db["chunks"].find(query, {"chunk_id": 1})
    chunks_to_delete = await cursor.to_list(length=None)
    chunk_ids = [c["chunk_id"] for c in chunks_to_delete if "chunk_id" in c]
    
    logger.info("Found %d chunks to delete for query: %s", len(chunk_ids), query)
    
    result = await db["chunks"].delete_many(query)
    
    # Remove vectors from FAISS index
    if chunk_ids:
        from vector_store import remove_from_index
        try:
            remove_from_index(chunk_ids)
            logger.info("Successfully removed %d chunks from FAISS index", len(chunk_ids))
        except Exception as exc:
            logger.exception("Failed to remove chunks from FAISS index: %s", exc)
        
    return {"message": "deleted", "deleted_count": result.deleted_count}
