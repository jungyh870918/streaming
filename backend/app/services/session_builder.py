"""
DialogueSessionBuilder — assembles a full DialogueSession from raw input.

Input format (JSON):
{
  "title": "At the Coffee Shop",
  "lines": [
    {"speaker": "A", "text": "...", "translation": "..."},
    {"speaker": "B", "text": "...", "translation": "..."}
  ]
}
"""
import hashlib
from typing import List, Optional
from ..core.models import (
    Speaker, DialogueLine, DialogueSession,
    SentenceSession, Chunk
)
from ..core.chunker import Chunker
from ..core.templates import get_template
from ..core.tts_service import TTSService


class DialogueSessionBuilder:
    def __init__(self, tts: TTSService, template_name: str = "dialogue_memorization"):
        self.chunker  = Chunker()
        self.tts      = tts
        self.template = get_template(template_name)

    async def build(self, title: str, raw_lines: List[dict]) -> DialogueSession:
        lines = [DialogueLine(
            speaker=Speaker(l["speaker"]),
            text=l["text"].strip(),
            translation=l.get("translation")
        ) for l in raw_lines]

        dialogue_id = hashlib.md5(title.encode()).hexdigest()[:10]

        # Pre-generate all TTS audio
        tts_items = []
        for line in lines:
            chunks = self.chunker.chunk(line.text)
            tts_items.append({"text": line.text,       "voice": line.speaker.value})
            for c in chunks:
                tts_items.append({"text": c.text,      "voice": line.speaker.value})
            if line.translation:
                tts_items.append({"text": line.translation, "voice": "default"})
        await self.tts.generate_batch(tts_items)

        # Build sentence sessions
        sessions: List[SentenceSession] = []
        for i, line in enumerate(lines):
            chunks = self.chunker.chunk(line.text)
            steps  = self.template.generate_steps(line.text, chunks, line.translation)
            sid    = hashlib.md5(f"{dialogue_id}_{i}".encode()).hexdigest()[:8]
            sessions.append(SentenceSession(
                sentence_id=sid,
                speaker=line.speaker,
                sentence_text=line.text,
                translation=line.translation,
                chunks=chunks,
                steps=steps,
            ))

        return DialogueSession(
            dialogue_id=dialogue_id,
            title=title,
            lines=lines,
            sentence_sessions=sessions,
            metadata={"template": self.template.name, "line_count": len(lines)},
        )
