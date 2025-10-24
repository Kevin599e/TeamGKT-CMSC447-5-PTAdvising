from flask import Blueprint, request, session
<<<<<<< HEAD
=======
from models import Packet, PacketSection, Template, StudentRequest, TemplateSection
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
from database import db_session
from models import (
    Packet,
    PacketSection,
    Template,
    TemplateSection,
    StudentRequest,
    SourceContent,
)
from services.docx_service import render_packet_docx
from services.latex_service import render_packet_pdf
import os
import json
from datetime import datetime

packets_bp = Blueprint("packets", __name__)


def require_auth():
    if "uid" not in session:
        return False, ({"error": "Unauthorized"}, 401)
    return True, None


def render_intro_text(intro_source_body: str, student_req: StudentRequest) -> str:
    """
    Fill placeholders in the intro template with student-specific info.
    """
    # super basic replacement; can switch to Jinja if you want
    text = intro_source_body
    text = text.replace("{{student_name}}", student_req.student_name or "")
    text = text.replace("{{student_email}}", student_req.student_email or "")
    text = text.replace("{{source_institution}}", student_req.source_institution or "")
    text = text.replace("{{target_program}}", student_req.target_program or "")
    return text


@packets_bp.post("/generate")
def generate_packet():
    """
    Create a new Packet for a student from a Template.

    Request JSON body:
    {
      "request_id": 123,
      "template_id": 5,
      "include_section_ids": [ <template_section_id>, ... ]  // optional
    }

    include_section_ids = which optional info_block sections to include.
    If not provided, we'll include ONLY non-optional sections.
    """
    ok, err = require_auth()
    if not ok:
        return err

    data = request.get_json() or {}
    req_id = data.get("request_id")
    tpl_id = data.get("template_id")
    include_ids = data.get("include_section_ids", [])

    student_req = db_session.query(StudentRequest).get(req_id)
    tpl = db_session.query(Template).get(tpl_id)

<<<<<<< HEAD
    if not student_req or not tpl:
        return {"error": "Invalid request_id or template_id"}, 400

    # create packet row
    p = Packet(
        request_id=student_req.id,
        template_id=tpl.id,
        status="draft",
        created_at=datetime.utcnow(),
    )
    db_session.add(p)
    db_session.flush()  # now we have p.id

    # get all template sections in order
=======
    # create the Packet
    p = Packet(
        request_id=sr.id,
        template_id=tpl.id,
        status="draft"
    )
    db_session.add(p)
    db_session.flush()  # so p.id exists

    # copy each TemplateSection -> PacketSection snapshot
    # we need the linked SourceContent text
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
    t_sections = (
        db_session.query(TemplateSection)
        .filter(TemplateSection.template_id == tpl.id)
        .order_by(TemplateSection.display_order.asc())
        .all()
    )

<<<<<<< HEAD
    for ts in t_sections:
        # handle optional info_block filtering
        if ts.section_type == "info_block" and ts.optional:
            if ts.id not in include_ids:
                # skip this info block for this packet
                continue

        # pull content source if any
        sc: SourceContent | None = ts.source_content

        # Decide what to freeze into PacketSection.content
        frozen_content_type = "text"
        frozen_content_body = ""

        if ts.section_type == "intro":
            # Build intro using placeholders + student request fields
            if sc:
                frozen_content_type = sc.content_type
                frozen_content_body = render_intro_text(sc.body, student_req)
            else:
                frozen_content_type = "text"
                frozen_content_body = (
                    f"Student: {student_req.student_name} ({student_req.student_email})\n"
                    f"From: {student_req.source_institution}\n"
                    f"Program: {student_req.target_program}\n"
                )

        elif ts.section_type == "plan_table":
            # program's 4-year path (table JSON)
            if sc:
                frozen_content_type = sc.content_type  # "table"
                frozen_content_body = sc.body          # JSON string
            else:
                frozen_content_type = "table"
                frozen_content_body = json.dumps({"columns": [], "rows": []})

        elif ts.section_type == "degree_audit":
            # advisor will fill this in later, but we pre-seed structure
            if sc:
                frozen_content_type = sc.content_type  # "audit_table"
                frozen_content_body = sc.body          # JSON schema w/ columns, empty rows
            else:
                frozen_content_type = "audit_table"
                frozen_content_body = json.dumps({
                    "columns": ["Requirement", "Satisfied By", "Status", "Credits"],
                    "rows": []
                })

        elif ts.section_type == "advisor_notes":
            # blank text area for advisor to personalize later
            frozen_content_type = "text"
            frozen_content_body = ""

        elif ts.section_type == "info_block":
            # static info block like deadlines/aid/policies
            if sc:
                frozen_content_type = sc.content_type
                frozen_content_body = sc.body
            else:
                frozen_content_type = "text"
                frozen_content_body = ""

        elif ts.section_type == "conclusion":
            if sc:
                frozen_content_type = sc.content_type
                frozen_content_body = sc.body
            else:
                frozen_content_type = "text"
                frozen_content_body = "Thank you for reviewing this packet."

        else:
            # fallback
            frozen_content_type = sc.content_type if sc else "text"
            frozen_content_body = sc.body if sc else ""

        ps = PacketSection(
            packet_id=p.id,
            title=ts.title,
            display_order=ts.display_order,
            section_type=ts.section_type,
            content_type=frozen_content_type,
            content=frozen_content_body,
=======
    for i, ts in enumerate(t_sections):
        sc = ts.source_content  # SourceContent row
        ps = PacketSection(
            packet_id=p.id,
            title=ts.title,
            display_order=i,
            content_type=sc.content_type if sc else "text",
            content=sc.body if sc else "",
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
        )
        db_session.add(ps)

    db_session.commit()

    return {
        "id": p.id,
        "status": p.status,
        "sections": [
            {
                "id": s.id,
                "title": s.title,
                "section_type": s.section_type,
            } for s in p.sections
        ],
    }



@packets_bp.post("/finalize")
def finalize():
    ok, err = require_auth()
    if not ok:
        return err

    data = request.get_json() or {}
    pid = data.get("packet_id")

    p = db_session.query(Packet).get(pid)
    if not p:
        return {"error": "Packet not found"}, 404

    p.status = "finalized"
    db_session.commit()

    return {"id": p.id, "status": p.status}


@packets_bp.post("/export")
def export():
    ok, err = require_auth()
    if not ok:
        return err

    data = request.get_json() or {}
    pid = data.get("packet_id")
<<<<<<< HEAD
    fmt = data.get("format", "docx")  # "docx" | "pdf"
=======
    format_ = data.get("format", "docx")  # "docx" | "pdf"
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d

    p = db_session.query(Packet).get(pid)
    if not p:
        return {"error": "Packet not found"}, 404

    sections = p.sections
    export_dir = os.getenv("EXPORT_DIR", "exports")

<<<<<<< HEAD
    if fmt == "pdf" and os.getenv("ENABLE_LATEX", "false").lower() == "true":
        pdf_path, err_msg = render_packet_pdf(
=======
    if format_ == "pdf" and os.getenv("ENABLE_LATEX", "false").lower() == "true":
        pdf_path, err = render_packet_pdf(
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
            p,
            sections,
            export_dir=export_dir,
            latex_bin=os.getenv("LATEX_BIN", "pdflatex"),
        )
<<<<<<< HEAD
        if err_msg:
            return {"error": err_msg}, 500
=======
        if err:
            return {"error": err}, 500
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
        return {"path": pdf_path}

    path = render_packet_docx(p, sections, export_dir=export_dir)
    return {"path": path}
