"""
Learnify AI — Word Scramble Content Extractor.

Processes user documents to extract educational vocabulary and generates
scrambled words for the Word Scramble mini-game.
"""

import random
import re
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase
from models.schemas import WordScrambleWord

# Standard English functional words to filter out
STOP_WORDS = {
    "the", "and", "a", "an", "in", "on", "at", "to", "for", "with", "from", "by",
    "of", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "but", "if", "or", "because", "as", "until", "while",
    "this", "that", "these", "those", "then", "there", "when", "where", "how",
    "which", "who", "whom", "whose", "each", "every", "many", "much", "some", "any"
}

# Curated fallback vocabulary used when no user-specific content is found
FALLBACK_WORDS = [
    {"word": "ALGORITHM", "hint": "A step-by-step procedure for solving a problem"},
    {"word": "DATABASE", "hint": "A structured set of data held in a computer"},
    {"word": "PROTOCOL", "hint": "A set of rules for data communication"},
    {"word": "COMPILER", "hint": "Refines source code into machine code"},
    {"word": "VARIABLE", "hint": "A storage location paired with an identifier"},
    {"word": "FUNCTION", "hint": "A reusable block of code that performs an action"},
    {"word": "INTERNET", "hint": "Global system of interconnected networks"},
    {"word": "SECURITY", "hint": "Protection from theft or damage to hardware/software"},
    {"word": "ANALYSIS", "hint": "Detailed examination of the elements of something"},
    {"word": "STRATEGY", "hint": "A plan of action designed to achieve a goal"},
    {"word": "LEARNING", "hint": "The acquisition of knowledge or skills through study"},
    {"word": "ADAPTIVE", "hint": "Capable of changing to suit different conditions"},
    {"word": "SEMANTIC", "hint": "Relating to meaning in language or logic"},
    {"word": "HARDWARE", "hint": "Physical components of a computer system"},
    {"word": "SOFTWARE", "hint": "Programs and other operating information"},
    {"word": "ENCODING", "hint": "Converting information into a specific format"},
    {"word": "PLATFORM", "hint": "Standard for computer hardware and software"},
    {"word": "DYNAMICS", "hint": "Forces or properties which stimulate growth"},
    {"word": "FEEDBACK", "hint": "Information about reactions to a product or task"},
    {"word": "RESPONSE", "hint": "A reaction to something that has happened"},
]


def _scramble_word(word: str) -> str:
    """
    Shuffles characters of a word, ensuring it differs from the original.
    
    Args:
        word: The original word string.
        
    Returns:
        A scrambled version of the word.
    """
    word = word.upper()
    chars = list(word)
    
    # Try random shuffle first (up to 5 attempts)
    for _ in range(5):
        random.shuffle(chars)
        scrambled = "".join(chars)
        if scrambled != word:
            return scrambled
            
    # Fallback 1: Simple reversal
    scrambled = word[::-1]
    if scrambled != word:
        return scrambled
        
    # Fallback 2: Swap start and end (for palindromes or short words)
    if len(word) > 1:
        chars = list(word)
        chars[0], chars[-1] = chars[-1], chars[0]
        return "".join(chars)
        
    return word


def _extract_words_from_text(text: str) -> List[str]:
    """
    Tokenizes text and filters for words suitable for the scramble game.
    Criteria: 5-12 chars, alphabetic only, non-stopword.
    """
    tokens = re.split(r'[^a-zA-Z]+', text)
    unique_words = set()
    
    for word in tokens:
        word_upper = word.upper()
        if 5 <= len(word_upper) <= 12 and word.isalpha():
            if word.lower() not in STOP_WORDS:
                unique_words.add(word_upper)
                
    return list(unique_words)


async def get_scramble_words(
    db: AsyncIOMotorDatabase, 
    user_id: str, 
    count: int = 5
) -> List[WordScrambleWord]:
    """
    Fetches words for the game by sampling user material or falling back to defaults.
    
    Args:
        db: Motor database instance.
        user_id: The ID of the user to pull context for.
        count: Desired number of words.
        
    Returns:
        List of WordScrambleWord model instances.
    """
    pool = []
    
    # 1. Sample up to 20 random chunks from the DB for this user
    cursor = db["chunks"].aggregate([
        {"$match": {"user_id": user_id}},
        {"$sample": {"size": 20}}
    ])
    
    async for chunk in cursor:
        text = chunk.get("text", "")
        source = chunk.get("source_file", "Uploaded Material")
        
        candidates = _extract_words_from_text(text)
        for cand in candidates:
            pool.append({
                "original": cand,
                "scrambled": _scramble_word(cand),
                "hint": f"Found in: {source}"
            })
            
    # 2. Shuffle and remove internal duplicates
    random.shuffle(pool)
    unique_by_word = {}
    for item in pool:
        if item["original"] not in unique_by_word:
            unique_by_word[item["original"]] = item
            
    results = list(unique_by_word.values())[:count]
    
    # 3. If shortfall, pull from curated educational vocabulary
    if len(results) < count:
        needed = count - len(results)
        # Filter fallbacks so we don't repeat words already found in user content
        existing_words = {r["original"] for r in results}
        available_fallbacks = [fb for fb in FALLBACK_WORDS if fb["word"] not in existing_words]
        
        sample_size = min(needed, len(available_fallbacks))
        selected_fallbacks = random.sample(available_fallbacks, sample_size)
        
        for fb in selected_fallbacks:
            results.append({
                "original": fb["word"],
                "scrambled": _scramble_word(fb["word"]),
                "hint": fb["hint"]
            })
            
    return [WordScrambleWord(**r) for r in results]
