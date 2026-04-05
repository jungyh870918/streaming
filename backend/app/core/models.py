from dataclasses import dataclass, field, asdict
from typing import Optional, List
from enum import Enum


class StepType(str, Enum):
    LISTEN   = "listen"          # 듣기만
    REPEAT   = "repeat"          # 듣고 바로 따라말하기
    RECALL   = "recall"          # 침묵 후 스스로 말하기
    RETRIEVE = "retrieve"        # 한글 큐만 보고 완전 인출


class Speaker(str, Enum):
    A = "A"
    B = "B"


class PM6RRound(str, Enum):
    MEMORIZATION = "memorization"   # P2: 3회 반복 듣기
    REPETITION   = "repetition"     # P3: 듣고 바로 따라말하기
    REFLECTION   = "reflection"     # P4: 핵심 문장 침묵 후 말하기
    REHEARSAL    = "rehearsal"      # P5: 대화 흐름 속 말하기
    RECITAL      = "recital"        # P6: 더 긴 침묵 후 말하기
    RETRIEVAL    = "retrieval"      # P7: 한글 큐만 보고 완전 인출


# 라운드별 침묵 시간 (초)
SILENCE_SECONDS = {
    PM6RRound.MEMORIZATION: 0,
    PM6RRound.REPETITION:   3,
    PM6RRound.REFLECTION:   5,
    PM6RRound.REHEARSAL:    10,
    PM6RRound.RECITAL:      15,
    PM6RRound.RETRIEVAL:    25,
}


@dataclass
class Chunk:
    text: str
    start_char: int
    end_char: int
    is_key_phrase: bool = False
    def to_dict(self): return asdict(self)


@dataclass
class Step:
    """한 문장의 한 스텝."""
    step_type: StepType
    speaker: Speaker
    sentence_text: str
    translation: Optional[str]      = None
    chunks: List[str]               = field(default_factory=list)
    audio_key: Optional[str]        = None
    chunk_audio_keys: List[str]     = field(default_factory=list)
    expected_text: Optional[str]    = None
    silence_seconds: int            = 0    # 말하기 전 카운트다운
    show_text: bool                 = True # 텍스트 표시 여부
    show_translation: bool          = False

    def to_dict(self):
        d = asdict(self)
        d["step_type"] = self.step_type.value
        d["speaker"]   = self.speaker.value
        return d


@dataclass
class PM6RRoundSession:
    """한 라운드 (예: Repetition) 의 전체 스텝 목록."""
    round_type: PM6RRound
    round_number: int               # 2~7
    steps: List[Step]               = field(default_factory=list)

    def to_dict(self):
        return {
            "round_type":   self.round_type.value,
            "round_number": self.round_number,
            "steps":        [s.to_dict() for s in self.steps],
        }


@dataclass
class DialogueLine:
    speaker: Speaker
    text: str
    translation: Optional[str] = None


@dataclass
class PM6RSession:
    """다이얼로그 하나의 전체 PM6R 세션 (라운드 2~7)."""
    dialogue_id: str
    title: str
    lines: List[DialogueLine]
    rounds: List[PM6RRoundSession]  = field(default_factory=list)
    metadata: dict                  = field(default_factory=dict)

    def to_dict(self):
        return {
            "dialogue_id": self.dialogue_id,
            "title":       self.title,
            "lines": [
                {"speaker": l.speaker.value, "text": l.text, "translation": l.translation}
                for l in self.lines
            ],
            "rounds":   [r.to_dict() for r in self.rounds],
            "metadata": self.metadata,
        }
