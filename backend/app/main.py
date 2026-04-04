"""
Dialogue Memorization Engine — FastAPI server.
"""
import json, os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .core.tts_service import TTSService
from .services.session_builder import DialogueSessionBuilder
from .services.content import get_all_dialogues, get_dialogue
from .core.templates import list_templates
from .db import engine, Base, get_db, SessionLocal
from .models_db import Dialogue
from .services.db_service import DialogueService, SessionService
from .init_db import init_db

BASE_DIR    = Path(__file__).parent
CACHE_DIR   = BASE_DIR / "cache" / "tts"
CONTENT_DIR = BASE_DIR.parent / "content"
STATIC_DIR  = BASE_DIR / "static"

CACHE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Dialogue Memorization Engine", version="3.0")

tts = TTSService(cache_dir=str(CACHE_DIR))


@app.on_event("startup")
def startup():
    """Initialize database on startup."""
    try:
        init_db()
    except Exception as e:
        print(f"Note: Database initialization skipped (may not be configured): {e}")



# ── Audio file serving ────────────────────────────────────────
@app.get("/audio/{filename}")
async def serve_audio(filename: str):
    path = CACHE_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Audio not found")
    return FileResponse(str(path), media_type="audio/mpeg")


# ── API ───────────────────────────────────────────────────────
@app.get("/api/dialogues")
async def list_dialogues(db: Session = Depends(get_db)):
    """List all dialogues from database."""
    try:
        dialogues = db.query(Dialogue).all()
        return {
            "dialogues": [
                {"id": d.id, "title": d.title, "line_count": len(d.lines)}
                for d in dialogues
            ]
        }
    except Exception:
        # Fallback to in-memory if DB not configured
        return {"dialogues": get_all_dialogues()}


@app.get("/api/dialogues/{dialogue_id}/session")
async def get_session(dialogue_id: str, template: str = "dialogue_memorization", db: Session = Depends(get_db)):
    # Try database first
    try:
        dialogue = db.query(Dialogue).filter(Dialogue.id == dialogue_id).first()
        if dialogue:
            raw = {"title": dialogue.title, "lines": dialogue.lines}
        else:
            raw = get_dialogue(dialogue_id)
    except Exception:
        raw = get_dialogue(dialogue_id)
    
    if not raw:
        raise HTTPException(404, "Dialogue not found")
    builder = DialogueSessionBuilder(tts, template_name=template)
    session = await builder.build(raw["title"], raw["lines"])
    
    # Save to database
    try:
        SessionService.create_session(db, dialogue_id, session.to_dict())
    except Exception:
        pass  # If DB is not configured, continue anyway
    
    return JSONResponse(session.to_dict())


class CustomDialogueRequest(BaseModel):
    title: str
    lines: list
    template: Optional[str] = "dialogue_memorization"

@app.post("/api/dialogues/custom")
async def create_custom_session(req: CustomDialogueRequest, db: Session = Depends(get_db)):
    builder = DialogueSessionBuilder(tts, template_name=req.template)
    session = await builder.build(req.title, req.lines)
    
    # Save to database
    try:
        SessionService.create_session(db, "custom", session.to_dict())
    except Exception:
        pass
    
    return JSONResponse(session.to_dict())


@app.get("/api/templates")
async def get_templates():
    return {"templates": list_templates()}


@app.get("/api/tts/url")
async def tts_url(text: str, voice: str = "default", rate: str = "-10%"):
    """Pre-generate TTS and return audio URL."""
    await tts.generate(text, voice=voice, rate=rate)
    return {"url": tts.audio_url(text, voice, rate)}


@app.get("/api/cache/stats")
async def cache_stats():
    return tts.stats()


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── SPA fallback ──────────────────────────────────────────────
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
