from flask import Blueprint, request, session
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

def add_info_block_to_packet(packet_id):
    """
    Advisor: add a new info_block PacketSection from a SourceContent.

    Body:
      {
        "source_content_id": 5,
        "title": "Optional override title",  # optional
        "display_order": 4                   # optional
      }
    """
    from models import Packet, PacketSection, SourceContent

    packet = db_session.query(Packet).get(packet_id)
    if not packet:
        return {"error": "Packet not found"}, 404

    data = request.get_json() or {}
    sc_id = data.get("source_content_id")
    if not sc_id:
        return {"error": "source_content_id is required"}, 400

    sc = db_session.query(SourceContent).get(sc_id)
    if not sc or not sc.active:
        return {"error": "SourceContent not found or inactive"}, 404

    # Default display_order: append to end
    if "display_order" in data:
        display_order = int(data["display_order"])
    else:
        max_order = max((s.display_order for s in packet.sections), default=0)
        display_order = max_order + 1

    title = data.get("title") or sc.title

    new_sec = PacketSection(
        packet_id=packet.id,
        title=title,
        display_order=display_order,
        section_type="info_block",
        content_type=sc.content_type,
        content=sc.body,
    )

    db_session.add(new_sec)
    db_session.commit()

    return {
        "id": new_sec.id,
        "packet_id": new_sec.packet_id,
        "title": new_sec.title,
        "display_order": new_sec.display_order,
        "section_type": new_sec.section_type,
        "content_type": new_sec.content_type,
        "content": new_sec.content,
    }, 201

@packets_bp.post("/generate")
def generate_packet():
    """
    Generate a Packet for a given StudentRequest + Template.

    Request JSON:
      {
        "request_id": 1,
        "template_id": 2,
        "include_section_ids": [3, 4, 5],          # TemplateSection ids (optional ones)
        "extra_source_content_ids": [10, 11, 12]   # NEW: SourceContent ids to append
      }
    """
    data = request.get_json() or {}

    # ----- basic validation -----
    request_id = data.get("request_id")
    template_id = data.get("template_id")
    if not request_id or not template_id:
        return {"error": "request_id and template_id are required"}, 400

    sr = db_session.query(StudentRequest).get(request_id)
    if not sr:
        return {"error": "StudentRequest not found"}, 404

    tmpl = db_session.query(Template).get(template_id)
    if not tmpl:
        return {"error": "Template not found"}, 404

    # IDs of optional template sections the advisor chose
    include_section_ids = data.get("include_section_ids", [])
    if not isinstance(include_section_ids, list):
        return {"error": "include_section_ids must be a list"}, 400

    # NEW: IDs of SourceContent blocks the advisor wants to add
    extra_source_content_ids = data.get("extra_source_content_ids", [])
    if not isinstance(extra_source_content_ids, list):
        return {"error": "extra_source_content_ids must be a list"}, 400

    # ----- create Packet -----
    packet = Packet(
        request_id=sr.id,
        template_id=tmpl.id,
        status="draft",
    )
    db_session.add(packet)
    db_session.flush()  # so packet.id is available

    # ----- add sections from Template -----
    # tmpl.sections is already ordered by display_order (per your relationship)
    for sec in tmpl.sections:
        # skip optional sections that were not chosen
        if sec.optional and sec.id not in include_section_ids:
            continue

        sc = sec.source_content  # might be None

        # decide what to put in content & content_type initially
        if sc is not None:
            content_type = sc.content_type
            content_body = sc.body
        else:
            # fallback by section_type
            if sec.section_type == "advisor_notes":
                content_type = "text"
                content_body = ""
            elif sec.section_type == "degree_audit":
                content_type = "audit_table"
                content_body = ""  # or some empty JSON schema
            elif sec.section_type == "intro":
                content_type = "text"
                content_body = ""  # you might auto-fill later
            else:
                content_type = "text"
                content_body = ""

        ps = PacketSection(
            packet = packet,
            title=sec.title,
            display_order=sec.display_order,
            section_type=sec.section_type,
            content_type=content_type,
            content=content_body,
        )
        db_session.add(ps)

        # ----- NEW: add extra SourceContent blocks as additional sections -----
    if extra_source_content_ids:
        # First, resolve and filter valid SourceContent blocks
        extra_blocks = []
        for sc_id in extra_source_content_ids:
            sc = db_session.query(SourceContent).get(sc_id)
            if sc and sc.active:
                extra_blocks.append(sc)

        if extra_blocks:
            # Take a snapshot of current sections (template-based), ordered
            sections = sorted(packet.sections, key=lambda ps: ps.display_order)

            n_extra = len(extra_blocks)

            # 1. Find the first conclusion section, if any
            first_conclusion_order = None
            for ps in sections:
                if ps.section_type == "conclusion":
                    first_conclusion_order = ps.display_order
                    break

            if first_conclusion_order is None:
                # No conclusion found → append at the end
                start_order = sections[-1].display_order + 1 if sections else 1
            else:
                # 2. Insert BEFORE the first conclusion
                start_order = first_conclusion_order

                # 3. Shift existing sections at or after this order up by n_extra
                for ps in sections:
                    if ps.display_order >= start_order:
                        ps.display_order += n_extra

            # 4. Insert the extra info blocks into the gap we just created
            order = start_order
            for sc in extra_blocks:
                ps = PacketSection(
                    packet=packet,
                    title=sc.title,
                    display_order=order,
                    section_type="info_block",      # or whatever type you prefer
                    content_type=sc.content_type,
                    content=sc.body,
                )
                db_session.add(ps)
                order += 1
    db_session.commit()

    return {
        "id": packet.id,
        "status": packet.status,
        "request_id": packet.request_id,
        "template_id": packet.template_id,
        "sections": [
            {
                "id": ps.id,
                "title": ps.title,
                "display_order": ps.display_order,
                "section_type": ps.section_type,
                "content_type": ps.content_type,
            }
            for ps in packet.sections
        ],
    }, 201


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
    fmt = data.get("format", "docx")  # "docx" | "pdf"

    p = db_session.query(Packet).get(pid)
    if not p:
        return {"error": "Packet not found"}, 404

    sections = p.sections
    export_dir = os.getenv("EXPORT_DIR", "exports")

    if fmt == "pdf" and os.getenv("ENABLE_LATEX", "false").lower() == "true":
        pdf_path, err_msg = render_packet_pdf(
            p,
            sections,
            export_dir=export_dir,
            latex_bin=os.getenv("LATEX_BIN", "pdflatex"),
        )
        if err_msg:
            return {"error": err_msg}, 500
        return {"path": pdf_path}

    path = render_packet_docx(p, sections, export_dir=export_dir)
    return {"path": path}
