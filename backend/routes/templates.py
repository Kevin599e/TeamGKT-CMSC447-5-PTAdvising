<<<<<<< HEAD
from flask import Blueprint, session
=======
from flask import Blueprint, request, session
from models import Template, TemplateSection, SourceContent
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
from database import db_session
from models import Template, TemplateSection, SourceContent

templates_bp = Blueprint("templates", __name__)


def require_admin():
    if session.get("role") != "admin":
        return False, ({"error": "Admin only"}, 403)
    return True, None

<<<<<<< HEAD
=======
@templates_bp.post("")
def create_template():
    ok, err = require_admin()
    if not ok:
        return err

    data = request.get_json() or {}
    t = Template(
        name=data.get("name", "Untitled"),
        active=bool(data.get("active", True))
    )
    db_session.add(t)
    db_session.flush()  # so t.id is available

    for i, s in enumerate(data.get("sections", [])):
        # we now expect each section to give us:
        # { "title": "...", "source_content_id": 123 }
        source_id = s.get("source_content_id")
        # optionally: verify the source exists
        sc = db_session.query(SourceContent).get(source_id)
        if not sc:
            # if bad id, you can either reject entire request or skip that section
            return {"error": f"Invalid source_content_id {source_id}"}, 400

        sec = TemplateSection(
            template_id=t.id,
            title=s.get("title", f"Section {i+1}"),
            display_order=s.get("display_order", i),
            source_content_id=source_id,
        )
        db_session.add(sec)

    db_session.commit()
    return {"id": t.id}, 201
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d


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
<<<<<<< HEAD
                "program_name": t.program.name if t.program else None,
=======
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
                "active": t.active,
                "sections": [
                    {
                        "id": s.id,
                        "title": s.title,
<<<<<<< HEAD
                        "section_type": s.section_type,
                        "display_order": s.display_order,
                        "optional": s.optional,
                    }
                    for s in t.sections
                ],
=======
                        "display_order": s.display_order,
                        "source_content_id": s.source_content_id,
                        # helpful for UI: include the current source text preview
                        "source_preview": {
                            "title": s.source_content.title,
                            "content_type": s.source_content.content_type,
                            "body": s.source_content.body,
                        } if s.source_content else None
                    }
                    for s in t.sections
                ]
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
            }
            for t in rows
        ]
    }
<<<<<<< HEAD


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
=======
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
