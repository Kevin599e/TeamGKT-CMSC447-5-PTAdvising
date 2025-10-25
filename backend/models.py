from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    ForeignKey,
    Boolean,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="advisor")  # "admin" | "advisor"
    created_at = Column(DateTime, default=datetime.utcnow)


class SourceProgram(Base):
    """
    Represents a UMBC program/major/track (e.g., 'Computer Science BS').
    A template is tied to a SourceProgram.
    """
    __tablename__ = "source_programs"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StudentRequest(Base):
    """
    A request to generate a packet for a specific student.
    Example:
    - student_name: 'Jane Doe'
    - source_institution: 'Montgomery College'
    - target_program: 'Computer Science BS'
    """
    __tablename__ = "student_requests"

    id = Column(Integer, primary_key=True)

    student_name = Column(String, nullable=False)
    student_email = Column(String, nullable=False)

    source_institution = Column(String, nullable=True)
    target_program = Column(String, nullable=True)

    advisor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    advisor = relationship("User")


class SourceContent(Base):
    """
    Canonical reusable content blocks.

    Can be:
    - intro script with placeholders
    - 4-year plan table (stored as JSON text)
    - info block text
    - conclusion text

    content_type guides rendering in exports:
    'text' | 'markdown' | 'table' | 'audit_table'
    """
    __tablename__ = "source_content"

    id = Column(Integer, primary_key=True)

    title = Column(String, nullable=False)
    content_type = Column(String, nullable=False, default="text")
    body = Column(Text, nullable=False)

    active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Template(Base):
    """
    A template is tied to exactly one SourceProgram.
    It defines the fixed, ordered section structure for packets of that program.
    """
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True)

    program_id = Column(Integer, ForeignKey("source_programs.id"), nullable=False)

    name = Column(String, nullable=False)
    active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    program = relationship("SourceProgram")

    sections = relationship(
        "TemplateSection",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateSection.display_order",
    )


class TemplateSection(Base):
    """
    A section definition in the template.

    section_type is one of:
      - 'intro'          (auto-filled from student info + base script)
      - 'plan_table'     (program's 4-year plan table from SourceContent)
      - 'degree_audit'   (advisor edits per student)
      - 'advisor_notes'  (free text advisor writes per student)
      - 'info_block'     (static info like deadlines/aid; advisor can choose include or skip)
      - 'conclusion'     (standard wrap-up)

    source_content_id:
      - intro: points to the intro script template
      - plan_table: points to the program's plan table
      - info_block: points to that info block text
      - conclusion: points to closing text
      - degree_audit: can point to an "empty audit table schema" definition
      - advisor_notes: can be NULL, advisor fills it later

    optional:
      - True  if this section is skippable (info blocks)
      - False if always included
    """
    __tablename__ = "template_sections"

    id = Column(Integer, primary_key=True)

    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)

    title = Column(String, nullable=False)
    display_order = Column(Integer, default=0)

    section_type = Column(String, nullable=False)
    optional = Column(Boolean, default=False)

    source_content_id = Column(Integer, ForeignKey("source_content.id"), nullable=True)

    template = relationship("Template", back_populates="sections")
    source_content = relationship("SourceContent")


class Packet(Base):
    """
    A generated packet for a specific student.
    After generation, we freeze the text/tables so even if SourceContent
    changes later, this packet stays historically accurate.
    """
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
        order_by="PacketSection.display_order",
    )


class PacketSection(Base):
    """
    Frozen section in a generated packet.

    section_type copied from TemplateSection.section_type.
    content_type copied from SourceContent.content_type (or inferred).
    content is final text/table json/etc. at generation time.

    Advisor can still edit content in 'draft' packets for:
    - degree_audit
    - advisor_notes
    before finalizing.
    """
    __tablename__ = "packet_sections"

    id = Column(Integer, primary_key=True)

    packet_id = Column(Integer, ForeignKey("packets.id"), nullable=False)

    title = Column(String, nullable=False)
    display_order = Column(Integer, default=0)

    section_type = Column(String, nullable=False)
    content_type = Column(String, nullable=False, default="text")
    content = Column(Text, nullable=True)

    packet = relationship("Packet", back_populates="sections")