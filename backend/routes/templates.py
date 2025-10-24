from flask import Blueprint, request, session
from models import Template, TemplateSection, SourceContent
from database import db_session

templates_bp = Blueprint("templates", __name__)

def require_admin():
    if session.get("role") != "admin":
        return False, ({"error": "Admin only"}, 403)
    return True, None

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


@templates_bp.get("")
def list_templates():
    rows = db_session.query(Template).all()
    return {
        "items": [
            {
                "id": t.id,
                "name": t.name,
                "active": t.active,
                "sections": [
                    {
                        "id": s.id,
                        "title": s.title,
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
            }
            for t in rows
        ]
    }
