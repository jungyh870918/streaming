"""Dialogue Memorization Engine — FastAPI server."""
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .core.tts_service import TTSService
from .services.pm6r_builder import PM6RBuilder
from .services.content import get_all_dialogues, get_dialogue
from .db import get_db
from .models_db import Dialogue
from .init_db import init_db

BASE_DIR   = Path(__file__).parent
CACHE_DIR  = BASE_DIR / "cache" / "tts"
STATIC_DIR = BASE_DIR / "static"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Dialogue Memorization Engine", version="4.0")
tts = TTSService(cache_dir=str(CACHE_DIR))


@app.on_event("startup")
def startup():
    try:
        init_db()
    except Exception as e:
        print(f"DB init skipped: {e}")


# ── Audio ─────────────────────────────────────────────────────
@app.get("/audio/{filename}")
async def serve_audio(filename: str):
    path = CACHE_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Audio not found")
    return FileResponse(str(path), media_type="audio/mpeg")


# ── Dialogues ─────────────────────────────────────────────────
@app.get("/api/dialogues")
async def list_dialogues(db: Session = Depends(get_db)):
    try:
        rows = db.query(Dialogue).all()
        if rows:
            return {"dialogues": [{"id": d.id, "title": d.title, "line_count": len(d.lines)} for d in rows]}
    except Exception:
        pass
    return {"dialogues": get_all_dialogues()}


# ── PM6R 세션 생성 (핵심 엔드포인트) ──────────────────────────
@app.get("/api/dialogues/{dialogue_id}/pm6r")
async def get_pm6r_session(dialogue_id: str, db: Session = Depends(get_db)):
    raw = None
    try:
        row = db.query(Dialogue).filter(Dialogue.id == dialogue_id).first()
        if row:
            raw = {"title": row.title, "lines": row.lines}
    except Exception:
        pass
    if not raw:
        raw = get_dialogue(dialogue_id)
    if not raw:
        raise HTTPException(404, "Dialogue not found")

    builder = PM6RBuilder(tts)
    session = await builder.build(raw["title"], raw["lines"])
    return JSONResponse(session.to_dict())


class CustomDialogueRequest(BaseModel):
    title: str
    lines: list
    template: Optional[str] = "pm6r"

@app.post("/api/dialogues/custom")
async def create_custom(req: CustomDialogueRequest, db: Session = Depends(get_db)):
    builder = PM6RBuilder(tts)
    session = await builder.build(req.title, req.lines)
    return JSONResponse(session.to_dict())


@app.get("/api/cache/stats")
async def cache_stats():
    return tts.stats()


@app.get("/health")
async def health():
    return {"status": "ok"}


app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
