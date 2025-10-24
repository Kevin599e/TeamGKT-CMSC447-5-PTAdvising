from flask import Blueprint, request, session
from models import Packet, PacketSection, Template, StudentRequest, TemplateSection
from database import db_session
from services.docx_service import render_packet_docx
from services.latex_service import render_packet_pdf
import os

packets_bp = Blueprint("packets", __name__)

def require_auth():
    if "uid" not in session:
        return False, ({"error": "Unauthorized"}, 401)
    return True, None

@packets_bp.post("/generate")
def generate():
    ok, err = require_auth()
    if not ok:
        return err

    data = request.get_json() or {}
    request_id = data.get("request_id")
    template_id = data.get("template_id")

    sr = db_session.query(StudentRequest).get(request_id)
    tpl = db_session.query(Template).get(template_id)
    if not sr or not tpl:
        return {"error": "Invalid request or template"}, 400

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
    t_sections = (
        db_session.query(TemplateSection)
        .filter(TemplateSection.template_id == tpl.id)
        .order_by(TemplateSection.display_order.asc())
        .all()
    )

    for i, ts in enumerate(t_sections):
        sc = ts.source_content  # SourceContent row
        ps = PacketSection(
            packet_id=p.id,
            title=ts.title,
            display_order=i,
            content_type=sc.content_type if sc else "text",
            content=sc.body if sc else "",
        )
        db_session.add(ps)

    db_session.commit()

    return {"id": p.id, "status": p.status}


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
    format_ = data.get("format", "docx")  # "docx" | "pdf"

    p = db_session.query(Packet).get(pid)
    if not p:
        return {"error": "Packet not found"}, 404

    sections = p.sections
    export_dir = os.getenv("EXPORT_DIR", "exports")

    if format_ == "pdf" and os.getenv("ENABLE_LATEX", "false").lower() == "true":
        pdf_path, err = render_packet_pdf(
            p,
            sections,
            export_dir=export_dir,
            latex_bin=os.getenv("LATEX_BIN", "pdflatex"),
        )
        if err:
            return {"error": err}, 500
        return {"path": pdf_path}

    path = render_packet_docx(p, sections, export_dir=export_dir)
    return {"path": path}
