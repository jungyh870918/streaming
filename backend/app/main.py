"""Dialogue Memorization Engine — FastAPI server v5."""
import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .core.tts_service import TTSService
from .services.audio_pipeline import AudioPipeline
from .services.content import get_all_dialogues, get_dialogue
from .db import get_db
from .models_db import Dialogue
from .init_db import init_db

BASE_DIR    = Path(__file__).parent
CACHE_DIR   = BASE_DIR / "cache" / "tts"
OUTPUT_DIR  = BASE_DIR / "output"
STATIC_DIR  = BASE_DIR / "static"

CACHE_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Dialogue Memorization Engine", version="5.0")
tts      = TTSService(cache_dir=str(CACHE_DIR))
pipeline = AudioPipeline(tts=tts, output_dir=str(OUTPUT_DIR))


@app.on_event("startup")
def startup():
    try:
        init_db()
    except Exception as e:
        print(f"DB init skipped: {e}")


# ── Audio 파일 서빙 ───────────────────────────────────────────
@app.get("/audio/{filename}")
async def serve_audio(filename: str):
    path = CACHE_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Audio not found")
    return FileResponse(str(path), media_type="audio/mpeg")


# ── 완성 음원 서빙 ────────────────────────────────────────────
@app.get("/output/{dialogue_id}/full.mp3")
async def serve_full_audio(dialogue_id: str):
    path = OUTPUT_DIR / dialogue_id / "full.mp3"
    if not path.exists():
        raise HTTPException(404, "Audio not generated yet. Call /api/dialogues/{id}/generate first.")
    return FileResponse(str(path), media_type="audio/mpeg",
                        headers={"Accept-Ranges": "bytes"})


@app.get("/output/{dialogue_id}/timeline.json")
async def serve_timeline(dialogue_id: str):
    path = OUTPUT_DIR / dialogue_id / "timeline.json"
    if not path.exists():
        raise HTTPException(404, "Timeline not found.")
    return JSONResponse(json.loads(path.read_text(encoding="utf-8")))


# ── 다이얼로그 목록 ───────────────────────────────────────────
@app.get("/api/dialogues")
async def list_dialogues(db: Session = Depends(get_db)):
    try:
        rows = db.query(Dialogue).all()
        if rows:
            result = []
            for d in rows:
                audio_ready = (OUTPUT_DIR / d.id / "full.mp3").exists()
                result.append({"id": d.id, "title": d.title,
                                "line_count": len(d.lines), "audio_ready": audio_ready})
            return {"dialogues": result}
    except Exception:
        pass
    dialogues = get_all_dialogues()
    for d in dialogues:
        d["audio_ready"] = (OUTPUT_DIR / d["id"] / "full.mp3").exists()
    return {"dialogues": dialogues}


# ── 음원 생성 (핵심) ──────────────────────────────────────────
@app.post("/api/dialogues/{dialogue_id}/generate")
async def generate_audio(dialogue_id: str, db: Session = Depends(get_db)):
    """PM6R 구조 음원 생성. 처음 한 번만 생성하고 이후는 캐시 반환."""
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

    result = await pipeline.build(dialogue_id, raw["title"], raw["lines"])
    return JSONResponse({
        "status":       "ready",
        "dialogue_id":  dialogue_id,
        "duration_sec": result["duration_sec"],
        "audio_url":    f"/output/{dialogue_id}/full.mp3",
        "timeline_url": f"/output/{dialogue_id}/timeline.json",
    })


# ── 음원 상태 확인 ────────────────────────────────────────────
@app.get("/api/dialogues/{dialogue_id}/status")
async def audio_status(dialogue_id: str):
    audio_path    = OUTPUT_DIR / dialogue_id / "full.mp3"
    timeline_path = OUTPUT_DIR / dialogue_id / "timeline.json"
    if audio_path.exists() and timeline_path.exists():
        tl = json.loads(timeline_path.read_text(encoding="utf-8"))
        return {
            "ready":        True,
            "duration_sec": tl.get("duration_sec"),
            "audio_url":    f"/output/{dialogue_id}/full.mp3",
            "timeline_url": f"/output/{dialogue_id}/timeline.json",
        }
    return {"ready": False}


class CustomDialogueRequest(BaseModel):
    title: str
    lines: list
    auto_generate: Optional[bool] = False

@app.post("/api/dialogues/custom")
async def create_custom(req: CustomDialogueRequest):
    import hashlib
    dialogue_id = hashlib.md5(req.title.encode()).hexdigest()[:10]
    result = {"dialogue_id": dialogue_id, "status": "created"}
    if req.auto_generate:
        gen = await pipeline.build(dialogue_id, req.title, req.lines)
        result.update({"status": "ready", "audio_url": f"/output/{dialogue_id}/full.mp3",
                       "timeline_url": f"/output/{dialogue_id}/timeline.json",
                       "duration_sec": gen["duration_sec"]})
    return JSONResponse(result)


@app.get("/api/cache/stats")
async def cache_stats():
    return tts.stats()

@app.get("/health")
async def health():
    return {"status": "ok"}


app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
