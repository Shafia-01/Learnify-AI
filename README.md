# 🧠 Learnify AI — Multimodal AI Learning Platform

Learnify AI is an **adaptive, AI-powered learning platform** that uses
Retrieval-Augmented Generation (RAG) to deliver personalised study
experiences. Upload PDFs, PowerPoints, or text files, and
the platform ingests, chunks, and indexes the content so you can ask
questions, take auto-generated quizzes, explore a knowledge graph, and
track your progress — all with real-time emotion-aware feedback and voice
interaction.

---

## 📂 Folder Structure

```
Learnify-AI/
├── frontend/          # React SPA (Vite + Tailwind CSS)
├── backend/           # FastAPI application
│   ├── config.py      # Pydantic Settings — env-var loader
│   ├── main.py        # App entry point, CORS, routers
│   ├── database.py    # Async MongoDB (Motor) connection
│   └── models/
│       └── schemas.py # All Pydantic data models
├── ml/                # Standalone ML scripts (emotion detection)
├── docs/              # Architecture & design notes
├── .env.example       # Backend env-var template
└── README.md          # ← You are here
```

---

## ⚡ Tech Stack

| Layer            | Technology                            |
|------------------|---------------------------------------|
| Frontend         | React 19 + Vite + Tailwind CSS 4      |
| Backend API      | FastAPI + Python 3.11+                |
| RAG Pipeline     | LangChain + FAISS + Google Gemini     |
| Database         | MongoDB (Motor async driver)          |
| Emotion Engine   | MediaPipe + DeepFace + OpenCV         |
| Voice            | Local Whisper (STT) + gTTS (TTS)      |
| Privacy Mode     | Ollama (100 % offline local LLM)      |

> **All services are free of cost.** No paid API keys (OpenAI, ElevenLabs,
> etc.) are used anywhere. Whisper runs locally. TTS uses gTTS only.

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+** — [python.org](https://www.python.org/downloads/)
- **Node.js 20+** — [nodejs.org](https://nodejs.org/)
- **MongoDB** — [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community) (or use MongoDB Atlas free tier)
- **Ollama** *(optional, for privacy mode)* — [ollama.com](https://ollama.com/)

### 1. Clone the repo

```bash
git clone https://github.com/Shafia-01/Learnify-AI.git
cd Learnify-AI
```

### 2. Backend setup

```bash
# Create a virtual environment (recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt

# Copy the env template and fill in your keys
cp .env.example .env
# Edit .env — at minimum set GEMINI_API_KEY and MONGODB_URI
```

### 3. Frontend setup

```bash
cd frontend

# Copy the env template
cp .env.example .env

# Install Node dependencies
npm install

cd ..
```

### 4. Start the servers

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

The API will be available at **http://localhost:8000** (docs at `/docs`).
The frontend will be available at **http://localhost:5173**.

### 5. Verify

```bash
# Health check
curl http://localhost:8000/health
# Expected: {"status": "ok"}
```

---

## 🔑 Environment Variables

### Backend (`.env` at project root)

| Variable           | Description                          | Default                          |
|--------------------|--------------------------------------|----------------------------------|
| `GEMINI_API_KEY`   | Google Gemini API key (free tier)     | —                                |
| `GROQ_API_KEY`     | Groq API key (free tier)             | —                                |
| `MONGODB_URI`      | MongoDB connection string            | `mongodb://localhost:27017/learnify` |
| `OLLAMA_BASE_URL`  | Ollama local LLM URL                 | `http://localhost:11434`         |
| `FAISS_INDEX_PATH` | Path to FAISS vector index directory | `./faiss_index`                  |
| `PRIVACY_MODE`     | Enable fully offline mode            | `false`                          |

### Frontend (`frontend/.env`)

| Variable             | Description                | Default                   |
|----------------------|----------------------------|---------------------------|
| `VITE_API_BASE_URL`  | Backend API base URL       | `http://localhost:8000`   |

---

## 🏗️ Architecture

See [`docs/architecture.md`](docs/architecture.md) for a detailed
breakdown of data flow, system components, and design decisions.

---

## ⚠️ Known Limitations

- **Ollama Privacy Mode**: This feature works only when running the platform locally on a machine with Ollama installed and running. It will not be available on the Render free deployment or any cloud hosting that lacks a local Ollama instance.
- **Whisper & OpenCV**: Local models (Whisper for STT and DeepFace for emotion detection) require significant CPU/RAM resources. Performance may vary on low-end machines.

---

## 📜 License

This project is for educational purposes.
