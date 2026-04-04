from dataclasses import dataclass, field, asdict
from typing import Optional, List
from enum import Enum

class StepType(str, Enum):
    FULL_LISTEN     = "full_listen"
    PROMPT_RESPONSE = "prompt_response"
    RECALL          = "recall"
    FULL_RECALL     = "full_recall"
    GAP             = "gap"

class Speaker(str, Enum):
    A = "A"
    B = "B"

@dataclass
class Chunk:
    text: str
    start_char: int
    end_char: int
    is_key_phrase: bool = False
    def to_dict(self): return asdict(self)

@dataclass
class Step:
    step_type: StepType
    mode: Optional[str]            = None
    visible_text: Optional[str]    = None
    answer_text: Optional[str]     = None
    cue: Optional[str]             = None
    audio_key: Optional[str]       = None
    expected_text: Optional[str]   = None
    evaluation_type: Optional[str] = None
    def to_dict(self):
        return {k: v.value if isinstance(v, Enum) else v
                for k, v in asdict(self).items()}

@dataclass
class SentenceSession:
    sentence_id: str
    speaker: Speaker
    sentence_text: str
    translation: Optional[str]
    chunks: List[Chunk]
    steps: List[Step]
    language: str = "en"
    def to_dict(self):
        return {
            "sentence_id":   self.sentence_id,
            "speaker":       self.speaker.value,
            "sentence_text": self.sentence_text,
            "translation":   self.translation,
            "chunks":        [c.to_dict() for c in self.chunks],
            "steps":         [s.to_dict() for s in self.steps],
            "language":      self.language,
        }

@dataclass
class DialogueLine:
    speaker: Speaker
    text: str
    translation: Optional[str] = None

@dataclass
class DialogueSession:
    dialogue_id: str
    title: str
    lines: List[DialogueLine]
    sentence_sessions: List[SentenceSession] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    def to_dict(self):
        return {
            "dialogue_id": self.dialogue_id,
            "title":       self.title,
            "lines": [{"speaker": l.speaker.value, "text": l.text, "translation": l.translation} for l in self.lines],
            "sentence_sessions": [s.to_dict() for s in self.sentence_sessions],
            "metadata": self.metadata,
        }
