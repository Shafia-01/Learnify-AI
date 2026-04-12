# Learnify AI — Architecture Notes

## Overview

Learnify AI is a multimodal AI-powered learning platform that uses Retrieval-Augmented
Generation (RAG) to deliver personalised, adaptive learning experiences.

## System Components

| Component       | Technology                        | Purpose                                  |
|-----------------|-----------------------------------|------------------------------------------|
| Frontend        | React + Vite + Tailwind CSS       | User interface and interactive dashboard |
| Backend API     | FastAPI + Python                  | REST API, business logic, orchestration  |
| RAG Pipeline    | LangChain + FAISS + Gemini        | Content ingestion, retrieval, generation |
| Database        | MongoDB (Motor async driver)      | Metadata, user profiles, analytics       |
| Emotion Engine  | MediaPipe + DeepFace              | Real-time emotion detection via webcam   |
| Voice           | Local Whisper + gTTS              | Speech-to-text and text-to-speech        |
| Privacy Mode    | Ollama (local LLM)               | Fully offline, privacy-preserving mode   |

## Data Flow

```
User uploads content (PDF/PPT/TXT/YouTube)
        │
        ▼
  Ingestion Pipeline (chunking, embedding)
        │
        ▼
  FAISS Vector Store  ◄──  Query Pipeline
        │                       │
        ▼                       ▼
  Gemini / Ollama LLM  ──► Response + Quiz + Knowledge Graph
        │
        ▼
  Gamification & Analytics Dashboard
```

## Folder Structure

```
/frontend   — React SPA (Vite + Tailwind CSS)
/backend    — FastAPI application
/ml         — Standalone ML scripts (emotion detection)
/docs       — Architecture documentation
```
