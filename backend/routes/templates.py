from flask import Blueprint, session
from database import db_session
from models import Template, TemplateSection, SourceContent

templates_bp = Blueprint("templates", __name__)


def require_admin():
    if session.get("role") != "admin":
        return False, ({"error": "Admin only"}, 403)
    return True, None


@templates_bp.get("")
def list_templates():
    """
    List all templates with high-level info so UI can display them.
    Advisors can also see this. Not admin-only.
    """
    rows = db_session.query(Template).all()
    return {
        "items": [
            {
                "id": t.id,
                "name": t.name,
                "program_name": t.program.name if t.program else None,
                "active": t.active,
                "sections": [
                    {
                        "id": s.id,
                        "title": s.title,
                        "section_type": s.section_type,
                        "display_order": s.display_order,
                        "optional": s.optional,
                    }
                    for s in t.sections
                ],
            }
            for t in rows
        ]
    }


@templates_bp.get("/<int:template_id>/builder")
def template_builder_view(template_id):
    """
    Return all sections in this template, including:
      - which ones are optional (advisor can pick them)
      - preview of SourceContent if exists (to help advisor decide)
    """
    t = db_session.query(Template).get(template_id)
    if not t:
        return {"error": "Template not found"}, 404

    result_sections = []
    for s in t.sections:
        sc = s.source_content
        preview = None
        if sc:
            # short preview body (first ~300 chars)
            preview = {
                "source_content_id": sc.id,
                "title": sc.title,
                "content_type": sc.content_type,
                "body_preview": sc.body[:300],
            }

        result_sections.append({
            "template_section_id": s.id,
            "title": s.title,
            "display_order": s.display_order,
            "section_type": s.section_type,
            "optional": s.optional,
            "source_content_preview": preview,
        })

    return {
        "template_id": t.id,
        "template_name": t.name,
        "program_name": t.program.name if t.program else None,
        "sections": result_sections,
    }
