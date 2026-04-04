from typing import List, Optional
from dataclasses import dataclass
from .models import Step, StepType, Chunk

def _key(t): return t[:20].strip().replace(" ", "_").lower()

def _listen(audio_key, visible=None):
    return Step(step_type=StepType.FULL_LISTEN, visible_text=visible, audio_key=audio_key, evaluation_type="none")

def _repeat(audio_key, expected, cue="따라 말하세요"):
    return Step(step_type=StepType.PROMPT_RESPONSE, cue=cue, audio_key=audio_key,
                answer_text=expected, expected_text=expected, evaluation_type="phonetic")

def _recall(cue, expected):
    return Step(step_type=StepType.RECALL, cue=cue, answer_text=expected,
                expected_text=expected, evaluation_type="semantic")

def _show(audio_key, answer):
    return Step(step_type=StepType.FULL_LISTEN, visible_text=answer, audio_key=audio_key, evaluation_type="none")

@dataclass
class Template:
    name: str
    description: str
    difficulty: str = "medium"
    def generate_steps(self, sentence, chunks, translation=None): raise NotImplementedError

class DialogueMemorization(Template):
    def __init__(self):
        super().__init__("dialogue_memorization",
            "핵심: 영어듣기→한글확인→파트반복×2→전체반복×2→인출→정답", "medium")
    def generate_steps(self, sentence, chunks, translation=None):
        sk = f"sent_{_key(sentence)}"
        steps = [_listen(sk, sentence)]
        if translation:
            steps.append(Step(step_type=StepType.FULL_LISTEN, visible_text=translation,
                              audio_key=f"trans_{_key(sentence)}", evaluation_type="none", mode="translation_reveal"))
        for _ in range(2):
            for c in chunks:
                ck = f"chunk_{_key(c.text)}"
                steps += [_listen(ck, c.text), _repeat(ck, c.text)]
        for _ in range(2):
            steps += [_listen(sk, sentence), _repeat(sk, sentence)]
        if translation:
            steps.append(_recall(translation, sentence))
        steps.append(_show(sk, sentence))
        return steps

class ChunkedRepetition(Template):
    def __init__(self):
        super().__init__("chunked_repetition", "워밍업: 전체듣기→청크별따라말하기", "easy")
    def generate_steps(self, sentence, chunks, translation=None):
        sk = f"sent_{_key(sentence)}"
        steps = [_listen(sk, sentence)]
        for c in chunks:
            ck = f"chunk_{_key(c.text)}"
            steps += [_listen(ck, c.text), _repeat(ck, c.text)]
        return steps

class CueBasedRecall(Template):
    def __init__(self):
        super().__init__("cue_based_recall", "고급: 한글큐→영어인출", "hard")
    def generate_steps(self, sentence, chunks, translation=None):
        sk = f"sent_{_key(sentence)}"
        if not translation: return [_listen(sk, sentence)]
        return [_recall(translation, sentence), _show(sk, sentence)]

class SimpleRepeat(Template):
    def __init__(self):
        super().__init__("simple_repeat", "입문: 듣고따라말하기", "easy")
    def generate_steps(self, sentence, chunks, translation=None):
        sk = f"sent_{_key(sentence)}"
        return [_listen(sk, sentence), _repeat(sk, sentence)]

class ProgressiveGap(Template):
    def __init__(self):
        super().__init__("progressive_gap", "중급: 점진적빈칸", "medium")
    def generate_steps(self, sentence, chunks, translation=None):
        sk = f"sent_{_key(sentence)}"
        steps = [_listen(sk, sentence)]
        words = sentence.split(); n = len(words)
        if n >= 4:
            cut = max(1, n // 4)
            steps.append(Step(step_type=StepType.GAP, mode="hide_tail",
                visible_text=" ".join(words[:-cut]) + " ___", answer_text=sentence,
                audio_key=sk, expected_text=" ".join(words[-cut:]), evaluation_type="semantic"))
        if n >= 6:
            q1, q3 = n // 3, 2 * n // 3
            steps.append(Step(step_type=StepType.GAP, mode="hide_middle",
                visible_text=" ".join(words[:q1]) + " ___ " + " ".join(words[q3:]),
                answer_text=sentence, audio_key=sk,
                expected_text=" ".join(words[q1:q3]), evaluation_type="semantic"))
        steps.append(Step(step_type=StepType.FULL_RECALL,
            cue=translation or "전체 문장을 말해보세요",
            answer_text=sentence, expected_text=sentence, evaluation_type="semantic"))
        return steps

TEMPLATES = {
    "dialogue_memorization": DialogueMemorization(),
    "simple_repeat":         SimpleRepeat(),
    "chunked_repetition":    ChunkedRepetition(),
    "cue_based_recall":      CueBasedRecall(),
    "progressive_gap":       ProgressiveGap(),
}

def get_template(name): return TEMPLATES.get(name, TEMPLATES["dialogue_memorization"])
def list_templates():
    return {n: {"description": t.description, "difficulty": t.difficulty} for n, t in TEMPLATES.items()}
