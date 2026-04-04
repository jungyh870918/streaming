import asyncio, hashlib, json, os, tempfile
from pathlib import Path
from typing import Optional
import edge_tts

VOICES = {
    "A": "en-US-GuyNeural",      # Speaker A — male
    "B": "en-US-JennyNeural",    # Speaker B — female
    "default": "en-US-JennyNeural",
}

class TTSService:
    def __init__(self, cache_dir: str = "cache/tts"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.meta_file = self.cache_dir / "meta.json"
        self.meta: dict = json.loads(self.meta_file.read_text()) if self.meta_file.exists() else {}

    def _hash(self, text, voice, rate):
        return hashlib.md5(f"{text}|{voice}|{rate}".encode()).hexdigest()

    def _path(self, h): return self.cache_dir / f"{h}.mp3"

    def _save_meta(self):
        self.meta_file.write_text(json.dumps(self.meta, ensure_ascii=False, indent=2))

    async def generate(self, text: str, voice: str = "default", rate: str = "-10%") -> Path:
        voice = VOICES.get(voice, voice)
        h = self._hash(text, voice, rate)
        p = self._path(h)
        if p.exists():
            return p
        comm = edge_tts.Communicate(text, voice=voice, rate=rate)
        await comm.save(str(p))
        self.meta[h] = {"text": text, "voice": voice, "rate": rate}
        self._save_meta()
        return p

    async def generate_batch(self, items: list[dict]) -> dict:
        tasks = [self.generate(i["text"], i.get("voice","default"), i.get("rate","-10%")) for i in items]
        paths = await asyncio.gather(*tasks)
        return {i["text"]: str(p) for i, p in zip(items, paths)}

    def audio_url(self, text: str, voice: str = "default", rate: str = "-10%") -> str:
        voice_name = VOICES.get(voice, voice)
        h = self._hash(text, voice_name, rate)
        return f"/audio/{h}.mp3"

    def stats(self):
        files = list(self.cache_dir.glob("*.mp3"))
        return {"files": len(files), "size_mb": round(sum(f.stat().st_size for f in files)/1e6, 2)}
