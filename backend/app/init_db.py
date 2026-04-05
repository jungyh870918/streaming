"""Initialize database tables and load sample data."""
from .db import engine, Base, SessionLocal
from .models_db import Dialogue
from .services.db_service import DialogueService
from .services.content import SAMPLE_DIALOGUES


def init_db():
    """Create all tables and load sample data."""
    Base.metadata.create_all(bind=engine)
    print("Database tables created")

    db = SessionLocal()
    try:
        for dialogue_data in SAMPLE_DIALOGUES:
            existing = db.query(Dialogue).filter(Dialogue.id == dialogue_data["id"]).first()
            if not existing:
                DialogueService.create_dialogue(
                    db,
                    id=dialogue_data["id"],
                    title=dialogue_data["title"],
                    lines=dialogue_data["lines"]
                )
                print(f"Loaded: {dialogue_data['title']}")
    finally:
        db.close()

    print("Database initialization complete")
