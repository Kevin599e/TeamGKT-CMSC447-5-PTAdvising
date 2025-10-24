from flask import Blueprint, request, session
from models import Template, TemplateSection
from database import db_session

templates_bp = Blueprint("templates", __name__)

def require_admin():
    if session.get("role") != "admin":
        return False, ({"error": "Admin only"}, 403)
    return True, None

@templates_bp.post("")
def create_template():
    ok, err = require_admin()
    if not ok: return err

    data = request.get_json() or {}
    t = Template(name=data.get("name", "Untitled"), active=bool(data.get("active", True)))
    db_session.add(t)
    db_session.flush()

    for i, s in enumerate(data.get("sections", [])):
        sec = TemplateSection(template_id=t.id, title=s.get("title", f"Section {i+1}"), content=s.get("content",""), display_order=i)
        db_session.add(sec)

    db_session.commit()
    return {"id": t.id}, 201

@templates_bp.get("")
def list_templates():
    rows = db_session.query(Template).all()
    return {"items": [{
        "id": t.id,
        "name": t.name,
        "active": t.active,
        "sections": [{"id": s.id, "title": s.title, "display_order": s.display_order} for s in t.sections]
    } for t in rows]}
