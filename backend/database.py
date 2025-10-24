import os
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///app.db")

engine = create_engine(DATABASE_URL, future=True)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    # Import all models so Base.metadata.create_all sees them
    from models import (
        User,
        SourceProgram,
        StudentRequest,
        SourceContent,
        Template,
        TemplateSection,
        Packet,
        PacketSection,
    )
    Base.metadata.create_all(bind=engine)
