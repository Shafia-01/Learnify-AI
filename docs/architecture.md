# Learnify AI Architecture

## Section 1 — System Overview

Learnify AI is built on an event-driven and modular architecture designed to provide a multimodal, personalized learning experience. The platform emphasizes a decoupled design where the backend acts as a robust API layer catering to various frontend requests, from real-time emotion detection via WebSockets to standard RESTful RAG queries. By maintaining a provider-agnostic LLM layer, the system ensures flexibility, allowing seamless runtime switching between Google Gemini, Groq, and local Ollama models without requiring application restarts.

A core philosophy of Learnify AI is its local-first approach for privacy-sensitive operations. Audio transcription via Whisper, emotion analysis via DeepFace, and vector embeddings using sentence-transformers all run entirely on the local machine. This ensures that biometric data and sensitive user documents never leave the device unless explicitly queried against a cloud LLM, which can be fully restricted using the built-in Privacy Mode.

## Section 2 — Full System Flow Diagram

```mermaid
flowchart TD
    subgraph CLIENT [Client Layer]
        UI[User Interface]
        WC[Webcam Feed]
        MIC[Microphone Input]
    end

    subgraph INGEST [Ingestion Pipeline]
        UP[File Upload (PDF/PPT/TXT)]
        PARSE[Parser Layer (pdf/ppt/txt)]
        CHUNK[Chunker (500 chars)]
        EMBED[Embedder (MinLM-L6)]
        FAISS[(FAISS Index L2)]
        MONGO[(MongoDB Chunks)]
    end

    subgraph QUERY [Query Pipeline]
        Q[User Question]
        QE[Query Embedder]
        SEARCH[FAISS Search Top-K]
        HYDRATE[MongoDB Hydration]
        LLM_CHAIN[LLM Chain Prompt]
    end

    subgraph LLM [LLM Provider Layer]
        GEMINI[Google Gemini]
        GROQ[Groq LLaMA]
        OLLAMA[Ollama Local]
        PRIVACY{Privacy Mode?}
    end

    subgraph RESPONSE [Response Layer]
        ANS[Answer + Citations]
        LEVEL[Level-Adaptive Prompt]
        LANG[Language Instruction]
    end

    subgraph FEATURES [Platform Features]
        QUIZ[Adaptive Quiz Engine]
        KG[Knowledge Graph]
        GAME[Mini Games]
        GOALS[Learning Goals]
        GAMIFY[Gamification]
    end

    subgraph VOICE [Voice Layer]
        STT[Whisper STT Local]
        TTS[gTTS 40+ Languages]
    end

    subgraph EMOTION [Emotion Engine]
        WS[WebSocket Stream]
        DEEPFACE[DeepFace Analysis]
        INTERV[Adaptive Intervention]
    end

    subgraph AUTH [Auth Layer]
        JWT[JWT Tokens]
        BCRYPT[bcrypt Password]
        REVOKE[(Revoked Tokens)]
    end

    UI -->|Upload| UP
    UP --> PARSE
    PARSE --> CHUNK
    CHUNK --> EMBED
    EMBED --> FAISS
    EMBED --> MONGO

    UI -->|Question| Q
    Q --> QE
    QE --> SEARCH
    SEARCH --> HYDRATE
    HYDRATE --> LLM_CHAIN
    LLM_CHAIN --> LEVEL
    LLM_CHAIN --> LANG
    LEVEL --> PRIVACY
    LANG --> PRIVACY
    PRIVACY -->|Yes| OLLAMA
    PRIVACY -->|No, Gemini| GEMINI
    PRIVACY -->|No, Groq| GROQ
    GEMINI --> ANS
    GROQ --> ANS
    OLLAMA --> ANS
    ANS --> UI

    MIC -->|Audio Bytes| STT
    STT -->|Transcript| UI
    UI -->|Text| TTS
    TTS -->|MP3 Stream| UI

    WC -->|Base64 Frame| WS
    WS --> DEEPFACE
    DEEPFACE -->|Emotion State| INTERV
    INTERV -->|Intervention| UI

    UI --> QUIZ
    UI --> KG
    UI --> GAME
    UI --> GOALS
    QUIZ --> GAMIFY
    GAME --> GAMIFY
    GOALS --> GAMIFY

    UI --> AUTH
    AUTH --> JWT
    AUTH --> BCRYPT
    JWT --> REVOKE
```

## Section 3 — Component Descriptions

| Module | File(s) | Responsibility |
|---|---|---|
| Ingestion Router | `routers/ingest.py` | Accepts file uploads, orchestrates parse→chunk→embed→store pipeline |
| PDF Parser | `parsers/pdf_parser.py` | Extracts text page-by-page using pdfplumber, skips encrypted/image-only pages |
| PPT Parser | `parsers/ppt_parser.py` | Extracts text from every text frame on each slide using python-pptx |
| TXT Parser | `parsers/txt_parser.py` | Splits plain text on double newlines into paragraph-level items |
| Chunker | `chunker.py` | Splits parsed items using LangChain RecursiveCharacterTextSplitter (500 chars, 50 overlap) |
| Embedder | `embedder.py` | Generates 384-dim vectors using sentence-transformers/all-MiniLM-L6-v2 |
| Vector Store | `vector_store.py` | Manages FAISS IndexFlatL2 with JSON sidecar mapping positions to chunk_ids |
| RAG Retriever | `rag/retriever.py` | Embeds query, searches FAISS, hydrates results from MongoDB, returns ContentChunk list |
| LLM Chain | `rag/llm_chain.py` | Constructs level-adaptive prompt, invokes LLM, parses citations from response |
| LLM Provider | `rag/llm_provider.py` | Runtime-mutable provider registry; supports Gemini, Groq, Ollama with privacy mode enforcement |
| Knowledge Graph | `rag/knowledge_graph.py` | Extracts noun phrases via NLTK, builds co-occurrence graph with NetworkX, returns D3-compatible payload |
| Learning Path | `rag/learning_path.py` | Uses LLM to sequence extracted concepts from foundational to advanced |
| Quiz Generator | `quiz/generator.py` | LLM-powered MCQ/fill/short-answer generation stored to MongoDB |
| Adaptive Selector | `quiz/adaptive_selector.py` | Fetches questions at user's current difficulty level, generates new ones if insufficient |
| Difficulty Engine | `quiz/difficulty_engine.py` | Updates running score per topic (0-100), maps score ranges to difficulty 1-5 |
| Gamification XP | `gamification/xp_engine.py` | Awards XP per event type, triggers badge evaluation after each award |
| Badge System | `gamification/badge_system.py` | Evaluates all badge definitions against user profile, persists newly unlocked badges |
| Streak Tracker | `gamification/streak_tracker.py` | Updates consecutive-day streak based on last_active_date comparison |
| Word Extractor | `games/word_extractor.py` | Samples user chunks, extracts 5-12 char educational words, scrambles for game |
| Content Generator | `games/content_generator.py` | LLM-generates MCQs, memory pairs, and flashcards from user material |
| STT | `voice/stt.py` | Transcribes audio bytes using local Whisper 'base' model |
| TTS | `voice/tts.py` | Synthesizes speech using gTTS, returns MP3 bytes |
| Emotion Engine | `app/ml_utils.py` | Decodes base64 frames, runs DeepFace analysis async, applies 5-frame smoothing buffer |
| Auth Utils | `auth_utils.py` | JWT encode/decode, bcrypt hashing, FastAPI dependency for current user extraction |
| Database | `database.py` | Motor async client, collection bootstrapping, index creation on startup |

## Section 4 — Data Flow: Ingestion Pipeline

1. **Upload/Input**: The user uploads a file (PDF, PPT, TXT) via the React interface.
2. **Parsing**: The API routing delegates the input to the appropriate parser. Text is extracted linearly into raw strings.
3. **Chunking**: `RecursiveCharacterTextSplitter` breaks the raw text into manageable chunks of ~500 characters with a 50-character overlap to preserve context between segments.
4. **Embedding**: Each chunk is passed to the local `all-MiniLM-L6-v2` model, generating a 384-dimensional dense vector representation.
5. **Vector Storage**: The vectors are inserted into an in-memory FAISS flat-L2 index. A standalone JSON mapping maintains the linkage between FAISS integer IDs and string `chunk_id`s.
6. **Metadata Storage**: The raw text, metadata, and string `chunk_id` for each chunk are persisted asynchronously to the MongoDB `chunks` collection.

## Section 5 — Data Flow: Query Pipeline

1. **Query Embed**: The user asks a question via the UI. The question is embedded using the exact same local `all-MiniLM-L6-v2` model to produce a 384-dimensional query vector.
2. **FAISS Search**: The query vector is compared against the FAISS index using L2 distance to retrieve the Top-K nearest neighbour integer IDs.
3. **ID Mapping**: The JSON sidecar maps the Top-K integer IDs back to string `chunk_id`s.
4. **Hydration**: The corresponding full-text chunks and their metadata are fetched from MongoDB using the mapped `chunk_id`s.
5. **Prompt Construction**: The hydrated chunks are compiled into a comprehensive prompt along with the user's explicit language preferences and current difficulty level.
6. **LLM Invocation**: The constructed prompt is routed to the active LLM provider (Gemini, Groq, or Ollama) to generate an answer.
7. **Response & Citations**: The LLM output is parsed to extract citations, combined with the retrieved chunks, and streamed back to the user interface.

## Section 6 — Privacy Mode Architecture

Privacy Mode is enforced at the lowest possible level in the LLM provider registry. The system utilizes a mutable singleton dictionary, `runtime_config`, to manage global state. When `runtime_config["privacy_mode"]` is enabled, the `get_llm()` factory function actively intercepts requests. It will block all non-Ollama calls and raise a `RuntimeError` rather than silently cascading to alternative cloud providers. This rigid constraint enforces a strict local-only execution boundary, ensuring absolutely zero cloud-bound telemetries or API queries occur.

## Section 7 — Scalability Notes

- **Index Growth**: The default FAISS flat-L2 index performs exhaustive exact search. To maintain sub-millisecond latencies, this will need to be transitioned to `IndexIVFFlat` (Inverted File Index) or a clustered vector database (e.g., Milvus, Qdrant) once the chunk count exceeds ~100k.
- **MongoDB Optimization**: Compound indices (e.g., on user_id + session_id) must be proactively expanded as querying combinations scale. Existing indices established on startup mitigate initial performance bottlenecks.
- **Horizontal Scaling Constraints**: Currently, FAISS operates in-process with a JSON map stored locally on disk. To horizontally scale the backend API layer across multiple containers or instances, this architecture will require migrating the vector store away from the standalone disk to a distributed vector service to avoid state fragmentation.
