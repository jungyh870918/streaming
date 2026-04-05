"""
PM6R Session Builder
라운드 2~7 을 순서대로 조립해서 PM6RSession 을 반환합니다.
"""
import hashlib
from typing import List
from ..core.models import (
    Speaker, DialogueLine, PM6RSession, PM6RRoundSession,
    PM6RRound, SILENCE_SECONDS, Step, StepType
)
from ..core.chunker import Chunker
from ..core.tts_service import TTSService


def _audio_key(text: str, voice: str, rate: str = "-10%") -> str:
    return hashlib.md5(f"{text}|{voice}|{rate}".encode()).hexdigest()


class PM6RBuilder:
    VOICES = {"A": "A", "B": "B", "ko": "default"}

    def __init__(self, tts: TTSService):
        self.tts     = tts
        self.chunker = Chunker()

    async def build(self, title: str, raw_lines: List[dict]) -> PM6RSession:
        lines = [
            DialogueLine(
                speaker=Speaker(l["speaker"]),
                text=l["text"].strip(),
                translation=l.get("translation"),
            )
            for l in raw_lines
        ]
        dialogue_id = hashlib.md5(title.encode()).hexdigest()[:10]

        # TTS 사전 생성
        await self._prebake_tts(lines)

        rounds = [
            self._round_memorization(lines),   # P2
            self._round_repetition(lines),     # P3
            self._round_reflection(lines),     # P4
            self._round_rehearsal(lines),      # P5
            self._round_recital(lines),        # P6
            self._round_retrieval(lines),      # P7
        ]

        return PM6RSession(
            dialogue_id=dialogue_id,
            title=title,
            lines=lines,
            rounds=rounds,
            metadata={"line_count": len(lines)},
        )

    # ── Round builders ────────────────────────────────────────

    def _round_memorization(self, lines) -> PM6RRoundSession:
        """P2: 각 문장을 3회 반복 듣기 + 한글 번역 1회."""
        steps = []
        for line in lines:
            ak = _audio_key(line.text, line.speaker.value)
            # 영어 3회
            for _ in range(3):
                steps.append(Step(
                    step_type=StepType.LISTEN,
                    speaker=line.speaker,
                    sentence_text=line.text,
                    audio_key=ak,
                    show_text=True,
                    silence_seconds=0,
                ))
            # 한글 1회
            if line.translation:
                steps.append(Step(
                    step_type=StepType.LISTEN,
                    speaker=line.speaker,
                    sentence_text=line.text,
                    translation=line.translation,
                    audio_key=_audio_key(line.translation, "default"),
                    show_text=True,
                    show_translation=True,
                    silence_seconds=0,
                ))
        return PM6RRoundSession(PM6RRound.MEMORIZATION, 2, steps)

    def _round_repetition(self, lines) -> PM6RRoundSession:
        """P3: 청크별 듣고 바로 따라말하기."""
        steps = []
        for line in lines:
            chunks = self.chunker.chunk(line.text)
            # 전체 문장 먼저 1회 듣기
            steps.append(Step(
                step_type=StepType.LISTEN,
                speaker=line.speaker,
                sentence_text=line.text,
                audio_key=_audio_key(line.text, line.speaker.value),
                show_text=True,
                silence_seconds=0,
            ))
            # 청크별 듣고 바로 따라말하기
            for chunk in chunks:
                ck = _audio_key(chunk.text, line.speaker.value)
                steps.append(Step(
                    step_type=StepType.REPEAT,
                    speaker=line.speaker,
                    sentence_text=line.text,
                    chunks=[chunk.text],
                    audio_key=ck,
                    expected_text=chunk.text,
                    show_text=True,
                    silence_seconds=SILENCE_SECONDS[PM6RRound.REPETITION],
                ))
            # 전체 문장 따라말하기
            steps.append(Step(
                step_type=StepType.REPEAT,
                speaker=line.speaker,
                sentence_text=line.text,
                audio_key=_audio_key(line.text, line.speaker.value),
                expected_text=line.text,
                show_text=True,
                silence_seconds=SILENCE_SECONDS[PM6RRound.REPETITION],
            ))
        return PM6RRoundSession(PM6RRound.REPETITION, 3, steps)

    def _round_reflection(self, lines) -> PM6RRoundSession:
        """P4: 핵심 문장만 침묵 후 말하기. 텍스트 표시."""
        steps = []
        for line in lines:
            ak = _audio_key(line.text, line.speaker.value)
            # 듣기 1회
            steps.append(Step(
                step_type=StepType.LISTEN,
                speaker=line.speaker,
                sentence_text=line.text,
                audio_key=ak,
                show_text=True,
                silence_seconds=0,
            ))
            # 침묵 후 말하기 (텍스트 보임)
            steps.append(Step(
                step_type=StepType.RECALL,
                speaker=line.speaker,
                sentence_text=line.text,
                audio_key=ak,
                expected_text=line.text,
                show_text=True,
                silence_seconds=SILENCE_SECONDS[PM6RRound.REFLECTION],
            ))
        return PM6RRoundSession(PM6RRound.REFLECTION, 4, steps)

    def _round_rehearsal(self, lines) -> PM6RRoundSession:
        """P5: 상대방 대사 들리면 내 대사 말하기. 텍스트 보임. 침묵 10초."""
        steps = []
        for i, line in enumerate(lines):
            ak = _audio_key(line.text, line.speaker.value)
            # 상대방 대사는 LISTEN, 내 대사는 RECALL
            if i == 0:
                # 첫 문장은 큐 없이 말하기
                steps.append(Step(
                    step_type=StepType.RECALL,
                    speaker=line.speaker,
                    sentence_text=line.text,
                    translation=line.translation,
                    audio_key=ak,
                    expected_text=line.text,
                    show_text=True,
                    show_translation=True,
                    silence_seconds=SILENCE_SECONDS[PM6RRound.REHEARSAL],
                ))
            else:
                # 이전 대사(상대방) 재생 → 현재 대사 말하기
                prev = lines[i - 1]
                steps.append(Step(
                    step_type=StepType.LISTEN,
                    speaker=prev.speaker,
                    sentence_text=prev.text,
                    audio_key=_audio_key(prev.text, prev.speaker.value),
                    show_text=True,
                    silence_seconds=0,
                ))
                steps.append(Step(
                    step_type=StepType.RECALL,
                    speaker=line.speaker,
                    sentence_text=line.text,
                    translation=line.translation,
                    audio_key=ak,
                    expected_text=line.text,
                    show_text=True,
                    show_translation=True,
                    silence_seconds=SILENCE_SECONDS[PM6RRound.REHEARSAL],
                ))
        return PM6RRoundSession(PM6RRound.REHEARSAL, 5, steps)

    def _round_recital(self, lines) -> PM6RRoundSession:
        """P6: 텍스트 숨기고 침묵 15초 후 말하기."""
        steps = []
        for i, line in enumerate(lines):
            ak = _audio_key(line.text, line.speaker.value)
            if i > 0:
                prev = lines[i - 1]
                steps.append(Step(
                    step_type=StepType.LISTEN,
                    speaker=prev.speaker,
                    sentence_text=prev.text,
                    audio_key=_audio_key(prev.text, prev.speaker.value),
                    show_text=False,
                    silence_seconds=0,
                ))
            steps.append(Step(
                step_type=StepType.RECALL,
                speaker=line.speaker,
                sentence_text=line.text,
                translation=line.translation,
                audio_key=ak,
                expected_text=line.text,
                show_text=False,          # 텍스트 숨김
                show_translation=True,    # 한글만 표시
                silence_seconds=SILENCE_SECONDS[PM6RRound.RECITAL],
            ))
        return PM6RRoundSession(PM6RRound.RECITAL, 6, steps)

    def _round_retrieval(self, lines) -> PM6RRoundSession:
        """P7: 한글 큐만 보고 완전 인출. 침묵 25초."""
        steps = []
        for line in lines:
            ak = _audio_key(line.text, line.speaker.value)
            steps.append(Step(
                step_type=StepType.RETRIEVE,
                speaker=line.speaker,
                sentence_text=line.text,
                translation=line.translation,
                audio_key=ak,
                expected_text=line.text,
                show_text=False,          # 영어 완전 숨김
                show_translation=True,    # 한글 큐만
                silence_seconds=SILENCE_SECONDS[PM6RRound.RETRIEVAL],
            ))
        return PM6RRoundSession(PM6RRound.RETRIEVAL, 7, steps)

    # ── TTS prebake ──────────────────────────────────────────

    async def _prebake_tts(self, lines: List[DialogueLine]):
        items = []
        for line in lines:
            items.append({"text": line.text, "voice": line.speaker.value})
            for chunk in self.chunker.chunk(line.text):
                items.append({"text": chunk.text, "voice": line.speaker.value})
            if line.translation:
                items.append({"text": line.translation, "voice": "default"})
        await self.tts.generate_batch(items)
