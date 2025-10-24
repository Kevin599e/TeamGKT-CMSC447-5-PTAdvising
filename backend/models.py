from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="advisor")
    created_at = Column(DateTime, default=datetime.utcnow)

class StudentRequest(Base):
    __tablename__ = "student_requests"
    id = Column(Integer, primary_key=True)
    student_name = Column(String, nullable=False)
    student_email = Column(String, nullable=False)
    source_institution = Column(String, nullable=True)
    target_program = Column(String, nullable=True)
    advisor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    advisor = relationship("User")

class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sections = relationship(
        "TemplateSection",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateSection.display_order"
    )


class TemplateSection(Base):
    __tablename__ = "template_sections"

    id = Column(Integer, primary_key=True)

    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)

    # visible header for this section in the generated packet
    title = Column(String, nullable=False)

    display_order = Column(Integer, default=0)

    # link to canonical content block
    source_content_id = Column(Integer, ForeignKey("source_content.id"), nullable=False)

    template = relationship("Template", back_populates="sections")
    source_content = relationship("SourceContent", back_populates="template_sections")

class Packet(Base):
    __tablename__ = "packets"

    id = Column(Integer, primary_key=True)

    request_id = Column(Integer, ForeignKey("student_requests.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)

    status = Column(String, default="draft")  # "draft" | "finalized"
    created_at = Column(DateTime, default=datetime.utcnow)

    request = relationship("StudentRequest")
    template = relationship("Template")
    sections = relationship(
        "PacketSection",
        back_populates="packet",
        cascade="all, delete-orphan",
        order_by="PacketSection.display_order"
    )


class PacketSection(Base):
    __tablename__ = "packet_sections"

    id = Column(Integer, primary_key=True)
    packet_id = Column(Integer, ForeignKey("packets.id"), nullable=False)

    # freeze the section header at generation time
    title = Column(String, nullable=False)

    display_order = Column(Integer, default=0)

    # SNAPSHOT of the actual advising content at generation time.
    # This is not a FK. It's copied text / copied table JSON rendered to text / etc.
    content_type = Column(String, nullable=False, default="text")
    content = Column(Text, nullable=True)

    packet = relationship("Packet", back_populates="sections")

class SourceContent(Base):
    __tablename__ = "source_content"

    id = Column(Integer, primary_key=True)

    # internal label, like "CS Major Requirements v2025-Fall"
    title = Column(String, nullable=False)

    # "text", "table", "markdown", etc.
    content_type = Column(String, nullable=False, default="text")

    # The actual data. For tables, this can be JSON string.
    body = Column(Text, nullable=False)

    active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # backrefs (optional convenience)
    template_sections = relationship("TemplateSection", back_populates="source_content")
