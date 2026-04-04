"""SQLAlchemy database models."""
from sqlalchemy import Column, String, Text, Integer, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base


class Dialogue(Base):
    __tablename__ = "dialogues"

    id = Column(String(50), primary_key=True)
    title = Column(String(255), nullable=False)
    lines = Column(JSON, nullable=False)  # Store as JSON
    template = Column(String(50), default="dialogue_memorization")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions = relationship("DialogueSession", back_populates="dialogue")


class DialogueSession(Base):
    __tablename__ = "dialogue_sessions"

    id = Column(String(50), primary_key=True)
    dialogue_id = Column(String(50), ForeignKey("dialogues.id"), nullable=False)
    user_id = Column(String(50), nullable=True)  # Optional user tracking
    session_data = Column(JSON, nullable=False)  # Full session object
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dialogue = relationship("Dialogue", back_populates="sessions")


class TTSCache(Base):
    __tablename__ = "tts_cache"

    id = Column(String(255), primary_key=True)  # Hash of text+voice+rate
    text = Column(Text, nullable=False)
    voice = Column(String(50), nullable=False)
    rate = Column(String(10), nullable=False)
    filename = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
