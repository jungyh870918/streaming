import re
from typing import List, Optional
from .models import Chunk

MIN_CHUNK_WORDS = 2
MAX_CHUNK_WORDS = 8

PUNCT_SPLIT_RE   = re.compile(r'(?<!\d)[,;:—–](?!\d)')
CONJUNCTION_RE   = re.compile(
    r'\s+(?=\b(?:and|or|but|so|yet|because|although|though|while|'
    r'when|where|if|unless|until|after|before|since|as|that|which|who)\b)',
    re.IGNORECASE)
VERB_BOUNDARY_RE = re.compile(
    r'\s+(?=\b(?:is|are|was|were|will|would|could|should|must|can|may|might|have|has|had|do|does|did)\b)',
    re.IGNORECASE)
KEY_PHRASE_RE    = re.compile(
    r'\b(?:can\'t|cannot|wouldn\'t|shouldn\'t|couldn\'t|mustn\'t|'
    r'will|would|could|should|must|have to|going to|used to|'
    r'because|although|unless|until|since|however|therefore|'
    r'actually|basically|seriously|literally)\b',
    re.IGNORECASE)

class Chunker:
    def __init__(self, prefer_source_split: bool = True):
        self.prefer_source_split = prefer_source_split

    def chunk(self, sentence: str) -> List[Chunk]:
        sentence = sentence.strip()
        raw = self._split(sentence)
        raw = self._guardrails(raw)
        return self._to_objects(sentence, raw)

    def _split(self, s):
        for fn in [self._by_punct, self._by_conjunction, self._by_verb, self._by_even]:
            parts = fn(s)
            if len(parts) > 1:
                return parts
        return [s]

    def _by_punct(self, s):
        m, q = self._mask(s)
        return [self._unmask(p, q).strip() for p in PUNCT_SPLIT_RE.split(m) if p.strip()]

    def _by_conjunction(self, s):
        m, q = self._mask(s)
        return [self._unmask(p, q).strip() for p in CONJUNCTION_RE.split(m) if p.strip()]

    def _by_verb(self, s):
        m, q = self._mask(s)
        parts = VERB_BOUNDARY_RE.split(m, maxsplit=1)
        return [self._unmask(p, q).strip() for p in parts if p.strip()]

    def _by_even(self, s):
        words = s.split()
        if len(words) <= MIN_CHUNK_WORDS: return [s]
        mid = len(words) // 2
        return [" ".join(words[:mid]), " ".join(words[mid:])]

    def _guardrails(self, parts):
        merged = []
        for p in parts:
            if merged and len(p.split()) < MIN_CHUNK_WORDS:
                merged[-1] += " " + p
            else:
                merged.append(p)
        result = []
        for p in merged:
            if len(p.split()) > MAX_CHUNK_WORDS:
                result.extend(self._by_even(p))
            else:
                result.append(p)
        return result

    def _to_objects(self, sentence, parts):
        chunks, cursor = [], 0
        for text in parts:
            start = sentence.find(text, cursor)
            if start == -1: start = cursor
            end = start + len(text)
            cursor = end
            chunks.append(Chunk(text=text.strip(), start_char=start, end_char=end,
                                is_key_phrase=bool(KEY_PHRASE_RE.search(text))))
        return chunks

    @staticmethod
    def _mask(text):
        quotes, counter = {}, [0]
        def rep(m):
            k = f"__Q{counter[0]}__"; quotes[k] = m.group(0); counter[0] += 1; return k
        return re.sub(r'(["\']).*?\1', rep, text), quotes

    @staticmethod
    def _unmask(text, quotes):
        for k, v in quotes.items(): text = text.replace(k, v)
        return text
