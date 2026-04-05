"""
PM6R Audio Pipeline
——————————————————
다이얼로그 텍스트 → 완성된 PM6R MP3 + 타임스탬프 JSON 생성

출력 구조:
  output/
    {dialogue_id}/
      full.mp3          ← 완성 음원
      timeline.json     ← 타임스탬프 (가사 싱크용)
"""
import asyncio
import json
from pathlib import Path
from typing import List, Dict

from pydub import AudioSegment

from ..core.tts_service import TTSService


# ── 타이밍 상수 (ms) ──────────────────────────────────────────
SILENCE = {
    "short":    1_500,   # 짧은 텀
    "medium":   3_000,   # 따라말하기 텀
    "long":     5_000,   # 생각할 시간
    "extra":    8_000,   # 역할극 대기
}

# 안내 멘트 텍스트
PROMPTS = {
    "listen":       "Listen carefully.",
    "repeat":       "Now repeat.",
    "your_turn":    "Your turn.",
    "again":        "One more time.",
    "well_done":    "Well done.",
    "role_a":       "You are Speaker A.",
    "role_b":       "You are Speaker B.",
    "final_check":  "Final check. Say each sentence.",
}


class AudioPipeline:
    def __init__(self, tts: TTSService, output_dir: str = "output"):
        self.tts        = tts
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def build(self, dialogue_id: str, title: str, lines: List[dict]) -> dict:
        """
        PM6R 구조대로 음원 생성.
        반환: {"audio_path": ..., "timeline_path": ..., "duration_sec": ...}
        """
        out_dir = self.output_dir / dialogue_id
        out_dir.mkdir(exist_ok=True)
        audio_path    = out_dir / "full.mp3"
        timeline_path = out_dir / "timeline.json"

        # 이미 생성된 경우 캐시 반환
        if audio_path.exists() and timeline_path.exists():
            tl = json.loads(timeline_path.read_text(encoding="utf-8"))
            return {
                "audio_path":    str(audio_path),
                "timeline_path": str(timeline_path),
                "duration_sec":  tl.get("duration_sec", 0),
            }

        # TTS 사전 생성
        await self._prebake(lines)

        # 음원 조립
        track, timeline = await self._assemble(title, lines)

        # 내보내기
        track.export(str(audio_path), format="mp3", bitrate="128k")
        duration = len(track) / 1000

        tl_data = {"dialogue_id": dialogue_id, "title": title,
                   "duration_sec": round(duration, 2), "events": timeline}
        timeline_path.write_text(
            json.dumps(tl_data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        return {
            "audio_path":    str(audio_path),
            "timeline_path": str(timeline_path),
            "duration_sec":  round(duration, 2),
        }

    # ── 조립 ────────────────────────────────────────────────

    async def _assemble(self, title: str, lines: list):
        track    = AudioSegment.empty()
        timeline = []
        cursor   = 0  # ms

        def add(seg: AudioSegment, event: dict = None):
            nonlocal cursor, track
            if event:
                event["time_ms"] = cursor
                event["time_sec"] = round(cursor / 1000, 2)
                timeline.append(event)
            track += seg
            cursor += len(seg)

        def silence(ms):
            add(AudioSegment.silent(duration=ms))

        async def prompt(key):
            """안내 멘트 재생."""
            p = await self.tts.generate(PROMPTS[key], voice="default", rate="+0%")
            add(self._load(p), {"type": "prompt", "text": PROMPTS[key]})
            silence(SILENCE["short"])

        async def say(line: dict, rate: str = "-10%"):
            """문장 재생 + 타임라인 이벤트."""
            p = await self.tts.generate(line["text"], voice=line["speaker"], rate=rate)
            add(self._load(p), {
                "type":        "sentence",
                "speaker":     line["speaker"],
                "text":        line["text"],
                "translation": line.get("translation"),
            })

        # ── 섹션 1: 전체 다이얼로그 2회 ──────────────────────
        add(AudioSegment.silent(500), {"type": "section", "label": "전체 듣기"})
        await prompt("listen")
        for _ in range(2):
            for line in lines:
                await say(line)
                silence(SILENCE["short"])
            silence(SILENCE["medium"])

        # ── 섹션 2: 전반부 / 후반부 나눠서 2회씩 ─────────────
        half = len(lines) // 2
        front, back = lines[:half], lines[half:]

        add(AudioSegment.silent(100), {"type": "section", "label": "전반부"})
        await prompt("listen")
        for _ in range(2):
            for line in front:
                await say(line)
                silence(SILENCE["short"])
            silence(SILENCE["medium"])

        add(AudioSegment.silent(100), {"type": "section", "label": "후반부"})
        await prompt("listen")
        for _ in range(2):
            for line in back:
                await say(line)
                silence(SILENCE["short"])
            silence(SILENCE["medium"])

        # ── 섹션 3: 문장 단위 반복 훈련 ──────────────────────
        add(AudioSegment.silent(100), {"type": "section", "label": "문장 반복"})
        for line in lines:
            words = line["text"].split()
            # 긴 문장이면 두 파트로 나눔 (8단어 이상)
            if len(words) >= 8:
                mid  = len(words) // 2
                part1 = {"speaker": line["speaker"], "text": " ".join(words[:mid]),
                         "translation": None}
                part2 = {"speaker": line["speaker"], "text": " ".join(words[mid:]),
                         "translation": None}
                parts = [part1, part2, line]  # 파트1, 파트2, 전체
            else:
                parts = [line]

            for part in parts:
                # 읽어줌 → 텀 → 읽어줌 → 텀 → 읽어줌 (3회)
                add(AudioSegment.silent(100),
                    {"type": "repeat_start", "text": part["text"]})
                for i in range(3):
                    await say(part)
                    silence(SILENCE["medium"])  # 따라말하기 텀

        # ── 섹션 4: 역할극 ────────────────────────────────────
        add(AudioSegment.silent(100), {"type": "section", "label": "역할극"})

        # A/B 쌍 단위로 자르기
        pairs = []
        for i in range(0, len(lines) - 1, 2):
            pairs.append((lines[i], lines[i+1] if i+1 < len(lines) else None))

        # 라운드 1: B 역할 (A 읽어줌 → B 말하도록 기다림 → 정답)
        await prompt("role_b")
        for a_line, b_line in pairs:
            if not b_line:
                continue
            await say(a_line)                           # A 읽어줌
            silence(SILENCE["extra"])                   # B가 말할 시간
            await prompt("again")
            await say(b_line)                           # 정답
            silence(SILENCE["medium"])

        # 라운드 2: A 역할 (B 읽어줌 → A 말하도록 기다림 → 정답)
        await prompt("role_a")
        for a_line, b_line in pairs:
            if not b_line:
                continue
            await say(b_line)                           # B 읽어줌
            silence(SILENCE["extra"])                   # A가 말할 시간
            await prompt("again")
            await say(a_line)                           # 정답
            silence(SILENCE["medium"])

        # ── 섹션 5: 최종 점검 ─────────────────────────────────
        add(AudioSegment.silent(100), {"type": "section", "label": "최종 점검"})
        await prompt("final_check")
        for line in lines:
            add(AudioSegment.silent(100),
                {"type": "final_check", "speaker": line["speaker"],
                 "text": line["text"], "translation": line.get("translation")})
            silence(SILENCE["extra"])   # 말할 시간
            await say(line)             # 정답
            silence(SILENCE["medium"])

        await prompt("well_done")

        return track, timeline

    # ── 헬퍼 ─────────────────────────────────────────────────

    async def _prebake(self, lines: list):
        items = []
        for line in lines:
            items.append({"text": line["text"], "voice": line["speaker"]})
            # 파트 분할용
            words = line["text"].split()
            if len(words) >= 8:
                mid = len(words) // 2
                items.append({"text": " ".join(words[:mid]), "voice": line["speaker"]})
                items.append({"text": " ".join(words[mid:]), "voice": line["speaker"]})
        # 안내 멘트
        for text in PROMPTS.values():
            items.append({"text": text, "voice": "default", "rate": "+0%"})
        await self.tts.generate_batch(items)

    @staticmethod
    def _load(path) -> AudioSegment:
        return AudioSegment.from_file(str(path))
