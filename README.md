# 🧠 Learnify AI

**An adaptive, multimodal AI learning platform that turns your study materials into a personalized tutor.**

![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue) ![Node 20+](https://img.shields.io/badge/Node-20+-green) ![FastAPI](https://img.shields.io/badge/FastAPI-005571?logo=fastapi) ![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)

## What Is Learnify AI?

A student uploads a PDF, PPT, or TXT file. The system ingests, chunks, and embeds the content into a FAISS vector index. The student then asks questions in natural language; the system retrieves the most relevant chunks and passes them to an LLM to generate a context-aware, level-appropriate answer with citations. Beyond Q&A, the platform generates adaptive quizzes, builds a visual knowledge graph of concepts, tracks XP and streaks, monitors emotional state via webcam, and offers mini educational games - all built around the student's own uploaded material.

Most AI tutors are generic. They answer from their training data, not from your textbook. Learnify AI grounds every response in your actual study material. The system adapts difficulty based on quiz performance, adjusts explanations based on your proficiency level (beginner/intermediate/advanced), and even detects when you look confused or tired and changes its approach.

This platform is for university students, self-learners, exam preppers, and educators who want to turn any document into an interactive AI tutor.

## Feature Matrix

| Feature | Description | Status |
|---|---|---|
| **RAG Q&A** | Chat with your uploaded documents using Retrieval-Augmented Generation | ✅ Active |
| **Adaptive Quiz** | Auto-generated quizzes that scale difficulty (1-5) based on performance | ✅ Active |
| **Knowledge Graph** | Visual D3.js node map of core concepts extracted via NLTK | ✅ Active |
| **Voice Input/Output** | Whisper local STT and gTTS multilingual synthesized speech | ✅ Active |
| **Emotion Detection** | Webcam-based real-time facial analysis to adjust tutoring tone | ✅ Active |
| **Gamification** | Earn XP, unlock badges, and maintain study streaks | ✅ Active |
| **Mini Games** | 6 dynamic games (Snake, Memory, Word Scramble, etc.) using your content | ✅ Active |
| **Privacy Mode** | Fully offline local LLM execution via Ollama | ✅ Active |
| **Multi-LLM Support** | Hot-swappable providers: Gemini, Groq, and Ollama | ✅ Active |
| **Multilingual Responses** | Chat and learn in your preferred target language | ✅ Active |
| **Learning Goals Tracker** | Set deadlines and let the AI build daily study plans | ✅ Active |
| **JWT Authentication** | Secure user registration and session management | ✅ Active |

## Why This Tech Stack?

| Layer | Technology | Why This, Not That |
|---|---|---|
| **Backend API** | FastAPI | Async-first, auto OpenAPI docs, Pydantic validation baked in. Chosen over Flask because of native async support required for concurrent LLM calls and WebSockets. |
| **RAG Pipeline** | LangChain + FAISS | LangChain provides provider-agnostic LLM abstractions so we can swap Gemini for Groq for Ollama with one config change. FAISS gives microsecond nearest-neighbour search without infrastructure overhead — no Pinecone billing, no Weaviate cluster to manage. |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2) | 384-dimensional embeddings, runs entirely locally, no API cost, fast inference. Produces embeddings good enough for educational document retrieval. |
| **Database** | MongoDB (Motor async) | Schema-flexible for rapidly evolving data models (quiz attempts, emotion events, game sessions all have different shapes). Motor gives native async without blocking the event loop. |
| **LLM Providers** | Gemini + Groq + Ollama | Three-tier strategy: Gemini for quality, Groq for speed (free tier, 500 req/day), Ollama for complete privacy. No vendor lock-in. |
| **Frontend** | React 19 + Vite + Tailwind CSS 4 | React 19's concurrent features for smooth UI updates. Vite for sub-second HMR. Tailwind 4's JIT engine for zero-runtime CSS. |
| **Voice** | Whisper (local STT) + gTTS | Whisper runs fully offline — student audio never leaves the machine. gTTS covers 40+ languages matching the multilingual response feature. |
| **Emotion Detection** | DeepFace + OpenCV | DeepFace abstracts over multiple face analysis backends (RetinaFace, MTCNN). OpenCV handles frame capture and preprocessing. Runs locally — no biometric data leaves the device. |
| **Knowledge Graph** | NLTK + NetworkX + D3.js | NLTK extracts noun phrases without an LLM call (fast, offline). NetworkX computes the graph. D3.js force simulation renders it interactively. |

## System Architecture

Learnify AI leverages a decoupled, event-driven architecture split into two primary pipelines. The **Ingestion Pipeline** orchestrates content flow from upload to storage: it parses documents (PDF/PPT/TXT), chunks the text, embeds the segments locally using `sentence-transformers`, and stores the vectors in a flat FAISS index mapped to a MongoDB metadata collection. The **Query Pipeline** handles student interactions: it embeds the incoming question, retrieves the nearest chunks from FAISS, hydrates the full text from MongoDB, constructs a level-adaptive prompt, and calls the active LLM provider. See `docs/architecture.md` for the full system diagram and detailed component descriptions.

## Problems Solved & Technical Decisions

1. **LLM provider hot-swapping without restart** - runtime_config dict acts as mutable singleton; set_provider() updates it at runtime; all LLM calls go through get_llm() which reads from it
2. **Privacy mode enforcement** - when enabled, get_llm() blocks all non-Ollama calls and raises RuntimeError rather than silently falling back to cloud
3. **Adaptive difficulty without user tagging** - quiz scores per topic stored as 0–100 running average; get_difficulty_level() maps score ranges to 1–5 difficulty; questions are fetched filtered by difficulty then generated if insufficient
4. **Knowledge graph scalability** - top-40 concept pruning prevents graph from becoming unnavigable; co-occurrence within chunks creates edges naturally without LLM calls
5. **Stale FAISS index on restart** - FAISS index written to disk after every ingest; JSON sidecar maps integer positions to chunk_id strings; index is loaded fresh on each search call
6. **WebSocket emotion data with high-FPS preview** - analysis runs in a separate async task every 1.5 seconds while the main loop draws the webcam preview at full frame rate; latest analysis result is shared via a dict
7. **Multi-language LLM responses** - language instruction injected into prompt template as a variable; LLM instructed to respond entirely in the target language; no translation API needed

## Getting Started

### Quick Start

```bash
git clone https://github.com/Shafia-01/Learnify-AI.git
cd Learnify-AI
cp backend/.env.example backend/.env
# Edit backend/.env to include MONGODB_URI and GEMINI_API_KEY
npm install --prefix frontend && pip install -r backend/requirements.txt
```

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **MongoDB**
- **Ollama** *(optional, for privacy mode)*

### 1. Backend setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
```

### 3. Start the servers

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default | Required? |
|---|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | — | Optional |
| `GROQ_API_KEY` | Groq API key | — | Optional |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/learnify` | **Yes** |
| `OLLAMA_BASE_URL` | Ollama local URL | `http://localhost:11434` | Optional |
| `FAISS_INDEX_PATH` | Path to FAISS index | `./faiss_index` | Optional |
| `PRIVACY_MODE` | Enable offline mode | `false` | Optional |

### Frontend (`frontend/.env`)

| Variable | Description | Default | Required? |
|---|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` | Optional |

## API Reference

| Prefix | Purpose | Key Endpoints |
|---|---|---|
| `/api/ingest` | Document ingestion | `POST /upload` |
| `/api/query` | RAG Q&A, learning path, knowledge graph | `POST /ask`, `GET /learning-path/{id}`, `GET /knowledge-graph/{id}` |
| `/api/quiz` | Quiz generation, submission, flashcards | `POST /generate`, `POST /submit`, `GET /flashcards/{id}` |
| `/api/gamification` | XP, badges, streaks, leaderboard | `GET /profile/{id}`, `POST /award/{id}`, `GET /leaderboard` |
| `/api/auth` | JWT auth, registration, profile | `POST /register`, `POST /login`, `GET /me` |
| `/api/voice` | STT transcription, TTS synthesis | `POST /transcribe`, `GET /speak` |
| `/api/games` | Mini games content & scoring | `GET /word-scramble/{id}`, `POST /score`, `GET /leaderboard/{game}` |
| `/api/settings` | LLM provider switching, privacy mode | `GET /status`, `POST /provider`, `POST /privacy` |
| `/api/goals` | Learning goal tracking & study plans | `POST /create`, `GET /{user_id}`, `GET /{goal_id}/daily-plan` |
| `/ws/emotion/{session_id}` | Real-time emotion WebSocket | WebSocket stream |

## Known Limitations

- **Ollama Privacy Mode**: This feature works only when running the platform locally on a machine with Ollama installed and running. It will not be available on the Render free deployment or any cloud hosting that lacks a local Ollama instance.
- **Whisper & OpenCV**: Local models (Whisper for STT and DeepFace for emotion detection) require significant CPU/RAM resources. Performance may vary on low-end machines.
- **Knowledge graph quality depends on NLTK noun phrase extraction which is heuristic; complex academic terminology may not extract correctly**
- **Emotion detection accuracy degrades in poor lighting or with glasses**
- **FAISS flat-L2 index (IndexFlatL2) performs exact search which scales to ~100k chunks before needing to switch to IndexIVFFlat**

## License

MIT License — Educational Use
