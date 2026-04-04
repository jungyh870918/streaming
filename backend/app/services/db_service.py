"""Database service for dialogues and sessions."""
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models_db import Dialogue, DialogueSession, TTSCache
from uuid import uuid4
import hashlib


class DialogueService:
    @staticmethod
    def create_dialogue(db: Session, id: str, title: str, lines: list, template: str = "dialogue_memorization"):
        dialogue = Dialogue(id=id, title=title, lines=lines, template=template)
        db.add(dialogue)
        db.commit()
        db.refresh(dialogue)
        return dialogue

    @staticmethod
    def get_dialogue(db: Session, dialogue_id: str):
        return db.query(Dialogue).filter(Dialogue.id == dialogue_id).first()

    @staticmethod
    def list_dialogues(db: Session):
        return db.query(Dialogue).all()

    @staticmethod
    def delete_dialogue(db: Session, dialogue_id: str):
        db.query(Dialogue).filter(Dialogue.id == dialogue_id).delete()
        db.commit()


class SessionService:
    @staticmethod
    def create_session(db: Session, dialogue_id: str, session_data: dict, user_id: str = None):
        session = DialogueSession(
            id=str(uuid4()),
            dialogue_id=dialogue_id,
            user_id=user_id,
            session_data=session_data
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_session(db: Session, session_id: str):
        return db.query(DialogueSession).filter(DialogueSession.id == session_id).first()

    @staticmethod
    def update_session(db: Session, session_id: str, completed: bool = False, session_data: dict = None):
        session = db.query(DialogueSession).filter(DialogueSession.id == session_id).first()
        if session:
            session.completed = completed
            if session_data:
                session.session_data = session_data
            db.commit()
            db.refresh(session)
        return session

    @staticmethod
    def get_user_sessions(db: Session, user_id: str):
        return db.query(DialogueSession).filter(DialogueSession.user_id == user_id).all()


class TTSCacheService:
    @staticmethod
    def _generate_cache_key(text: str, voice: str, rate: str) -> str:
        return hashlib.md5(f"{text}_{voice}_{rate}".encode()).hexdigest()

    @staticmethod
    def get_cache(db: Session, text: str, voice: str, rate: str):
        cache_key = TTSCacheService._generate_cache_key(text, voice, rate)
        return db.query(TTSCache).filter(TTSCache.id == cache_key).first()

    @staticmethod
    def set_cache(db: Session, text: str, voice: str, rate: str, filename: str):
        cache_key = TTSCacheService._generate_cache_key(text, voice, rate)
        cache = TTSCache(id=cache_key, text=text, voice=voice, rate=rate, filename=filename)
        db.add(cache)
        db.commit()
        return cache

    @staticmethod
    def get_all_cache(db: Session):
        return db.query(TTSCache).all()
